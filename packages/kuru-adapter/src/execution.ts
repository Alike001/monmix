import {
  decodeEventLog,
  encodePacked,
  getAddress,
  keccak256,
  type Address,
  type Hex,
  type Log,
  type PublicClient,
} from 'viem';
import { KURU_DIRECT_ORDER_ABI } from './abi.ts';
import {
  EIP1967_IMPLEMENTATION_SLOT,
  KURU_MON_USDC_IMPLEMENTATION,
  KURU_MON_USDC_IMPLEMENTATION_CODE_HASH,
  KURU_MON_USDC_MARKET,
  MONAD_MAINNET_CHAIN_ID,
} from './addresses.ts';
import { readMarketSnapshot } from './market.ts';
import { readWalletBalances } from './market.ts';

export type PreflightFailureCode =
  | 'WRONG_CHAIN'
  | 'UNEXPECTED_MARKET'
  | 'MARKET_CHANGED'
  | 'STALE_MARKET'
  | 'NO_LIQUIDITY'
  | 'INVALID_AMOUNT'
  | 'BELOW_MARKET_MINIMUM'
  | 'ABOVE_MARKET_MAXIMUM'
  | 'INSUFFICIENT_MON'
  | 'INSUFFICIENT_USDC'
  | 'NO_ALLOWANCE'
  | 'SIMULATION_FAILED';

export class PreflightError extends Error {
  readonly code: PreflightFailureCode;

  constructor(code: PreflightFailureCode, message: string) {
    super(message);
    this.name = 'PreflightError';
    this.code = code;
  }
}

export interface NativeSellPreparation {
  chainId: 143;
  account: Address;
  marketAddress: Address;
  implementationAddress: Address;
  implementationCodeHash: Hex;
  blockNumber: bigint;
  observedAtSeconds: bigint;
  expiresAtSeconds: bigint;
  baseAmountAtoms: bigint;
  sizeRaw: bigint;
  expectedQuoteAtoms: bigint;
  minimumQuoteAtoms: bigint;
  slippageBps: bigint;
  gasEstimate: bigint;
  gasPriceWei: bigint;
  maximumGasCostWei: bigint;
  walletBalanceWei: bigint;
  walletQuoteBalanceAtoms: bigint;
  bestBidX18: bigint;
  valuationPriceX18: bigint;
  estimatedPriceImpactBps: bigint;
  takerFeeBps: bigint;
  fillOrKill: true;
  isMargin: false;
  fingerprint: Hex;
}

export type NativeSellPreparationDto = {
  chainId: 143;
  account: Address;
  marketAddress: Address;
  implementationAddress: Address;
  implementationCodeHash: Hex;
  blockNumber: string;
  observedAtSeconds: string;
  expiresAtSeconds: string;
  baseAmountAtoms: string;
  sizeRaw: string;
  expectedQuoteAtoms: string;
  minimumQuoteAtoms: string;
  slippageBps: string;
  gasEstimate: string;
  gasPriceWei: string;
  maximumGasCostWei: string;
  walletBalanceWei: string;
  walletQuoteBalanceAtoms: string;
  bestBidX18: string;
  valuationPriceX18: string;
  estimatedPriceImpactBps: string;
  takerFeeBps: string;
  fillOrKill: true;
  isMargin: false;
  fingerprint: Hex;
};

export function normalizeBaseAtomsToSizeRaw(
  baseAtoms: bigint,
  sizePrecision: bigint,
  baseDecimals: bigint,
): { sizeRaw: bigint; normalizedBaseAtoms: bigint } {
  if (baseAtoms <= 0n || sizePrecision <= 0n || baseDecimals < 0n) {
    throw new PreflightError('INVALID_AMOUNT', 'Sell amount must be positive and use valid market precision.');
  }
  const multiplier = 10n ** baseDecimals;
  const sizeRaw = (baseAtoms * sizePrecision) / multiplier;
  if (sizeRaw === 0n) throw new PreflightError('INVALID_AMOUNT', 'Sell amount rounds to zero at Kuru precision.');
  return { sizeRaw, normalizedBaseAtoms: (sizeRaw * multiplier) / sizePrecision };
}

export function minimumOutputAfterSlippage(expected: bigint, slippageBps: bigint): bigint {
  if (expected <= 0n) throw new PreflightError('SIMULATION_FAILED', 'Simulation returned no quote output.');
  if (slippageBps < 0n || slippageBps > 1_000n) {
    throw new PreflightError('INVALID_AMOUNT', 'Slippage must be between 0 and 10%.');
  }
  return (expected * (10_000n - slippageBps)) / 10_000n;
}

export function estimatedSellPriceImpactBps(expectedQuoteAtoms: bigint, baseAmountAtoms: bigint, bestBidX18: bigint): bigint {
  if (expectedQuoteAtoms <= 0n || baseAmountAtoms <= 0n || bestBidX18 <= 0n) {
    throw new PreflightError('INVALID_AMOUNT', 'Price-impact inputs must be positive.');
  }
  const averagePriceX18 = (expectedQuoteAtoms * 10n ** 30n) / baseAmountAtoms;
  return averagePriceX18 >= bestBidX18 ? 0n : ((bestBidX18 - averagePriceX18) * 10_000n) / bestBidX18;
}

export function assertDeclaredOrderSize(sizeRaw: bigint, minSize: bigint, maxSize: bigint): void {
  if (sizeRaw < minSize) {
    throw new PreflightError('BELOW_MARKET_MINIMUM', 'Kuru declares a 200 MON minimum for this market. Smaller adjustments are not transaction-ready.');
  }
  if (sizeRaw > maxSize) throw new PreflightError('ABOVE_MARKET_MAXIMUM', 'Adjustment exceeds the market maximum size.');
}

export async function simulateProtectedNativeSell(
  client: PublicClient,
  input: { account: Address; sizeRaw: bigint; baseAmountAtoms: bigint; slippageBps: bigint },
): Promise<{ expectedQuoteAtoms: bigint; minimumQuoteAtoms: bigint; gasEstimate: bigint; gasPriceWei: bigint }> {
  const common = {
    account: input.account,
    address: KURU_MON_USDC_MARKET,
    abi: KURU_DIRECT_ORDER_ABI,
    functionName: 'placeAndExecuteMarketSell' as const,
    value: input.baseAmountAtoms,
  };
  try {
    const initial = await client.simulateContract({ ...common, args: [input.sizeRaw, 0n, false, true] });
    const expectedQuoteAtoms = initial.result;
    const minimumQuoteAtoms = minimumOutputAfterSlippage(expectedQuoteAtoms, input.slippageBps);
    const args = [input.sizeRaw, minimumQuoteAtoms, false, true] as const;
    await client.simulateContract({ ...common, args });
    const [gasEstimate, gasPriceWei] = await Promise.all([
      client.estimateContractGas({ ...common, args }),
      client.getGasPrice(),
    ]);
    return { expectedQuoteAtoms, minimumQuoteAtoms, gasEstimate, gasPriceWei };
  } catch (error) {
    if (error instanceof PreflightError) throw error;
    throw new PreflightError('SIMULATION_FAILED', error instanceof Error ? error.message : 'Kuru simulation failed.');
  }
}

export async function verifyDeployedMarket(client: PublicClient): Promise<{ implementation: Address; codeHash: Hex }> {
  const chainId = await client.getChainId();
  if (chainId !== MONAD_MAINNET_CHAIN_ID) throw new PreflightError('WRONG_CHAIN', `Expected Monad chain 143, received ${chainId}.`);
  const raw = await client.getStorageAt({ address: KURU_MON_USDC_MARKET, slot: EIP1967_IMPLEMENTATION_SLOT });
  if (!raw) throw new PreflightError('UNEXPECTED_MARKET', 'Kuru proxy implementation slot is empty.');
  const implementation = getAddress(`0x${raw.slice(-40)}`);
  if (implementation !== getAddress(KURU_MON_USDC_IMPLEMENTATION)) {
    throw new PreflightError('MARKET_CHANGED', `Kuru implementation changed to ${implementation}.`);
  }
  const bytecode = await client.getBytecode({ address: implementation });
  if (!bytecode) throw new PreflightError('UNEXPECTED_MARKET', 'Kuru implementation has no bytecode.');
  const codeHash = keccak256(bytecode);
  if (codeHash !== KURU_MON_USDC_IMPLEMENTATION_CODE_HASH) {
    throw new PreflightError('MARKET_CHANGED', `Kuru implementation bytecode changed (${codeHash}).`);
  }
  return { implementation, codeHash };
}

export async function prepareNativeMarketSell(
  client: PublicClient,
  input: { account: Address; baseAmountAtoms: bigint; slippageBps: bigint; nowSeconds?: bigint },
): Promise<NativeSellPreparation> {
  const account = getAddress(input.account);
  const nowSeconds = input.nowSeconds ?? BigInt(Math.floor(Date.now() / 1000));
  const [deployment, snapshot, walletBalances, blockNumber] = await Promise.all([
    verifyDeployedMarket(client),
    readMarketSnapshot(client, nowSeconds),
    readWalletBalances(client, account),
    client.getBlockNumber(),
  ]);
  if (snapshot.status === 'STALE') throw new PreflightError('STALE_MARKET', 'The Kuru order book is stale.');
  if (snapshot.status === 'EMPTY') throw new PreflightError('NO_LIQUIDITY', 'The Kuru order book has no two-sided liquidity.');
  const normalized = normalizeBaseAtomsToSizeRaw(input.baseAmountAtoms, snapshot.params.sizePrecision, snapshot.params.baseAssetDecimals);
  assertDeclaredOrderSize(normalized.sizeRaw, snapshot.params.minSize, snapshot.params.maxSize);
  const walletBalanceWei = walletBalances.mon;
  if (walletBalanceWei < normalized.normalizedBaseAtoms) {
    throw new PreflightError('INSUFFICIENT_MON', 'Wallet MON balance is below the exact sell amount.');
  }
  try {
    const simulation = await simulateProtectedNativeSell(client, {
      account,
      sizeRaw: normalized.sizeRaw,
      baseAmountAtoms: normalized.normalizedBaseAtoms,
      slippageBps: input.slippageBps,
    });
    const { expectedQuoteAtoms, minimumQuoteAtoms, gasEstimate, gasPriceWei } = simulation;
    const maximumGasCostWei = gasEstimate * gasPriceWei;
    if (walletBalanceWei < normalized.normalizedBaseAtoms + maximumGasCostWei) {
      throw new PreflightError('INSUFFICIENT_MON', 'Wallet cannot cover both the sell amount and estimated network gas.');
    }
    const expiresAtSeconds = nowSeconds + 20n;
    const estimatedPriceImpactBps = estimatedSellPriceImpactBps(expectedQuoteAtoms, normalized.normalizedBaseAtoms, snapshot.bestBidX18);
    const fingerprint = keccak256(encodePacked(
      ['uint256', 'address', 'address', 'uint96', 'uint256', 'uint256', 'bool'],
      [BigInt(MONAD_MAINNET_CHAIN_ID), account, KURU_MON_USDC_MARKET, normalized.sizeRaw, minimumQuoteAtoms, blockNumber, true],
    ));
    return {
      chainId: 143, account, marketAddress: KURU_MON_USDC_MARKET,
      implementationAddress: deployment.implementation, implementationCodeHash: deployment.codeHash,
      blockNumber, observedAtSeconds: snapshot.observedAtSeconds, expiresAtSeconds,
      baseAmountAtoms: normalized.normalizedBaseAtoms, sizeRaw: normalized.sizeRaw,
      expectedQuoteAtoms, minimumQuoteAtoms, slippageBps: input.slippageBps,
      gasEstimate, gasPriceWei, maximumGasCostWei, walletBalanceWei,
      walletQuoteBalanceAtoms: walletBalances.usdc, bestBidX18: snapshot.bestBidX18, estimatedPriceImpactBps,
      valuationPriceX18: snapshot.midpointX18,
      takerFeeBps: snapshot.params.takerFeeBps, fillOrKill: true, isMargin: false, fingerprint,
    };
  } catch (error) {
    if (error instanceof PreflightError) throw error;
    throw new PreflightError('SIMULATION_FAILED', error instanceof Error ? error.message : 'Kuru simulation failed.');
  }
}

export function serializeNativeSellPreparation(value: NativeSellPreparation): NativeSellPreparationDto {
  return Object.fromEntries(Object.entries(value).map(([key, item]) =>
    typeof item === 'bigint' ? [key, item.toString()] : [key, item],
  )) as NativeSellPreparationDto;
}

export interface DecodedTrade {
  orderId: bigint;
  makerAddress: Address;
  isBuy: boolean;
  priceRaw: bigint;
  updatedSizeRaw: bigint;
  takerAddress: Address;
  transactionOrigin: Address;
  filledSizeRaw: bigint;
}

export function decodeKuruTrades(logs: readonly Log[], expectedTaker: Address): DecodedTrade[] {
  const taker = getAddress(expectedTaker);
  const trades: DecodedTrade[] = [];
  for (const log of logs) {
    if (getAddress(log.address) !== getAddress(KURU_MON_USDC_MARKET)) continue;
    try {
      const decoded = decodeEventLog({ abi: KURU_DIRECT_ORDER_ABI, data: log.data, topics: log.topics, eventName: 'Trade' });
      if (getAddress(decoded.args.takerAddress) !== taker) continue;
      trades.push({ orderId: BigInt(decoded.args.orderId), makerAddress: decoded.args.makerAddress,
        isBuy: decoded.args.isBuy, priceRaw: decoded.args.price, updatedSizeRaw: decoded.args.updatedSize,
        takerAddress: decoded.args.takerAddress, transactionOrigin: decoded.args.txOrigin,
        filledSizeRaw: decoded.args.filledSize });
    } catch {
      // Other market logs are intentionally ignored.
    }
  }
  return trades;
}
