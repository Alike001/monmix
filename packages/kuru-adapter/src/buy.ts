import { decodeEventLog, encodePacked, getAddress, keccak256, type Address, type Hex, type Log, type PublicClient } from 'viem';
import { ERC20_APPROVAL_ABI, ERC20_READ_ABI, KURU_DIRECT_ORDER_ABI } from './abi.ts';
import {
  KURU_MON_USDC_MARKET,
  MONAD_MAINNET_CHAIN_ID,
  USDC_ADDRESS,
} from './addresses.ts';
import { minimumOutputAfterSlippage, PreflightError, verifyDeployedMarket } from './execution.ts';
import { readMarketSnapshot, readWalletBalances } from './market.ts';

const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000';

export interface NativeBuyPreparation {
  chainId: 143;
  account: Address;
  marketAddress: Address;
  quoteTokenAddress: Address;
  approvalSpender: Address;
  implementationAddress: Address;
  implementationCodeHash: Hex;
  blockNumber: bigint;
  observedAtSeconds: bigint;
  expiresAtSeconds: bigint;
  requestedQuoteAtoms: bigint;
  quoteAmountAtoms: bigint;
  quoteSizeRaw: bigint;
  expectedBaseAtoms: bigint;
  minimumBaseAtoms: bigint;
  declaredMinimumBaseAtoms: bigint;
  slippageBps: bigint;
  walletMonBalanceWei: bigint;
  walletQuoteBalanceAtoms: bigint;
  currentAllowanceAtoms: bigint;
  approvalRequired: boolean;
  approvalAmountAtoms: bigint;
  approvalGasEstimate: bigint;
  buyGasEstimate: bigint | null;
  gasPriceWei: bigint;
  maximumApprovalGasCostWei: bigint;
  maximumBuyGasCostWei: bigint | null;
  bestAskX18: bigint;
  valuationPriceX18: bigint;
  estimatedPriceImpactBps: bigint;
  takerFeeBps: bigint;
  fillOrKill: true;
  isMargin: false;
  exactBuySimulationPassed: boolean;
  fingerprint: Hex;
}

export type NativeBuyPreparationDto = {
  [K in keyof NativeBuyPreparation]: NativeBuyPreparation[K] extends bigint
    ? string
    : NativeBuyPreparation[K] extends bigint | null
      ? string | null
      : NativeBuyPreparation[K]
};

export function normalizeQuoteAtomsToPriceRaw(
  quoteAtoms: bigint,
  pricePrecision: bigint,
  quoteDecimals: bigint,
): { quoteSizeRaw: bigint; normalizedQuoteAtoms: bigint } {
  if (quoteAtoms <= 0n || pricePrecision <= 0n || quoteDecimals < 0n) {
    throw new PreflightError('INVALID_AMOUNT', 'Buy amount must be positive and use valid quote precision.');
  }
  const quoteMultiplier = 10n ** quoteDecimals;
  const quoteSizeRaw = (quoteAtoms * pricePrecision) / quoteMultiplier;
  if (quoteSizeRaw <= 0n || quoteSizeRaw > 2n ** 96n - 1n) {
    throw new PreflightError('INVALID_AMOUNT', 'Buy amount is outside Kuru quote-size precision.');
  }
  return { quoteSizeRaw, normalizedQuoteAtoms: (quoteSizeRaw * quoteMultiplier) / pricePrecision };
}

export function estimatedBuyPriceImpactBps(
  quoteAtoms: bigint,
  expectedBaseAtoms: bigint,
  bestAskX18: bigint,
): bigint {
  if (quoteAtoms <= 0n || expectedBaseAtoms <= 0n || bestAskX18 <= 0n) {
    throw new PreflightError('INVALID_AMOUNT', 'Price-impact inputs must be positive.');
  }
  const averagePriceX18 = (quoteAtoms * 10n ** 30n) / expectedBaseAtoms;
  return averagePriceX18 <= bestAskX18 ? 0n : ((averagePriceX18 - bestAskX18) * 10_000n) / bestAskX18;
}

export async function prepareNativeMarketBuy(
  client: PublicClient,
  input: { account: Address; quoteAmountAtoms: bigint; slippageBps: bigint; nowSeconds?: bigint },
): Promise<NativeBuyPreparation> {
  const account = getAddress(input.account);
  const nowSeconds = input.nowSeconds ?? BigInt(Math.floor(Date.now() / 1000));
  const [deployment, snapshot, balances, allowance, blockNumber, tokenDecimals, tokenSymbol] = await Promise.all([
    verifyDeployedMarket(client),
    readMarketSnapshot(client, nowSeconds),
    readWalletBalances(client, account),
    client.readContract({ address: USDC_ADDRESS, abi: ERC20_READ_ABI, functionName: 'allowance', args: [account, KURU_MON_USDC_MARKET] }),
    client.getBlockNumber(),
    client.readContract({ address: USDC_ADDRESS, abi: ERC20_READ_ABI, functionName: 'decimals' }),
    client.readContract({ address: USDC_ADDRESS, abi: ERC20_READ_ABI, functionName: 'symbol' }),
  ]);
  if (tokenDecimals !== 6 || tokenSymbol !== 'USDC') throw new PreflightError('UNEXPECTED_MARKET', 'Configured quote token is not the verified six-decimal USDC deployment.');
  if (snapshot.status === 'STALE') throw new PreflightError('STALE_MARKET', 'The Kuru order book is stale.');
  if (snapshot.status === 'EMPTY') throw new PreflightError('NO_LIQUIDITY', 'The Kuru order book has no two-sided liquidity.');
  const normalized = normalizeQuoteAtomsToPriceRaw(input.quoteAmountAtoms, snapshot.params.pricePrecision, snapshot.params.quoteAssetDecimals);
  if (balances.usdc < normalized.normalizedQuoteAtoms) throw new PreflightError('INSUFFICIENT_USDC', 'Wallet USDC balance is below the exact buy amount.');

  try {
    const quoteCall = { address: KURU_MON_USDC_MARKET, abi: KURU_DIRECT_ORDER_ABI, functionName: 'placeAndExecuteMarketBuy' as const, value: 0n };
    const quote = await client.simulateContract({ ...quoteCall, account: ZERO_ADDRESS, args: [normalized.quoteSizeRaw, 0n, false, true] });
    const expectedBaseAtoms = quote.result;
    const declaredMinimumBaseAtoms = (snapshot.params.minSize * 10n ** snapshot.params.baseAssetDecimals) / snapshot.params.sizePrecision;
    if (expectedBaseAtoms < declaredMinimumBaseAtoms) {
      throw new PreflightError('BELOW_MARKET_MINIMUM', 'The protected buy would receive less than Kuru’s declared 200 MON market minimum.');
    }
    const minimumBaseAtoms = minimumOutputAfterSlippage(expectedBaseAtoms, input.slippageBps);
    await client.simulateContract({ ...quoteCall, account: ZERO_ADDRESS, args: [normalized.quoteSizeRaw, minimumBaseAtoms, false, true] });

    const approvalRequired = allowance < normalized.normalizedQuoteAtoms;
    const approvalAmountAtoms = approvalRequired ? normalized.normalizedQuoteAtoms : 0n;
    const gasPriceWei = await client.getGasPrice();
    let approvalGasEstimate = 0n;
    let buyGasEstimate: bigint | null = null;
    if (approvalRequired) {
      const approvalCall = { account, address: USDC_ADDRESS, abi: ERC20_APPROVAL_ABI, functionName: 'approve' as const, args: [KURU_MON_USDC_MARKET, approvalAmountAtoms] as const };
      await client.simulateContract(approvalCall);
      approvalGasEstimate = await client.estimateContractGas(approvalCall);
    } else {
      const exactBuyCall = { ...quoteCall, account, args: [normalized.quoteSizeRaw, minimumBaseAtoms, false, true] as const };
      await client.simulateContract(exactBuyCall);
      buyGasEstimate = await client.estimateContractGas(exactBuyCall);
    }
    const maximumApprovalGasCostWei = approvalGasEstimate * gasPriceWei;
    const maximumBuyGasCostWei = buyGasEstimate === null ? null : buyGasEstimate * gasPriceWei;
    const knownGasCost = maximumApprovalGasCostWei + (maximumBuyGasCostWei ?? 0n);
    if (balances.mon < knownGasCost) throw new PreflightError('INSUFFICIENT_MON', 'Wallet MON balance cannot cover the currently estimable network fee.');
    const expiresAtSeconds = nowSeconds + 20n;
    const fingerprint = keccak256(encodePacked(
      ['uint256', 'address', 'address', 'uint96', 'uint256', 'uint256', 'bool'],
      [BigInt(MONAD_MAINNET_CHAIN_ID), account, KURU_MON_USDC_MARKET, normalized.quoteSizeRaw, minimumBaseAtoms, blockNumber, false],
    ));
    return {
      chainId: 143, account, marketAddress: KURU_MON_USDC_MARKET, quoteTokenAddress: USDC_ADDRESS,
      approvalSpender: KURU_MON_USDC_MARKET, implementationAddress: deployment.implementation,
      implementationCodeHash: deployment.codeHash, blockNumber, observedAtSeconds: snapshot.observedAtSeconds,
      expiresAtSeconds, requestedQuoteAtoms: input.quoteAmountAtoms, quoteAmountAtoms: normalized.normalizedQuoteAtoms,
      quoteSizeRaw: normalized.quoteSizeRaw, expectedBaseAtoms, minimumBaseAtoms, declaredMinimumBaseAtoms,
      slippageBps: input.slippageBps, walletMonBalanceWei: balances.mon, walletQuoteBalanceAtoms: balances.usdc,
      currentAllowanceAtoms: allowance, approvalRequired, approvalAmountAtoms, approvalGasEstimate, buyGasEstimate,
      gasPriceWei, maximumApprovalGasCostWei, maximumBuyGasCostWei, bestAskX18: snapshot.bestAskX18,
      valuationPriceX18: snapshot.midpointX18,
      estimatedPriceImpactBps: estimatedBuyPriceImpactBps(normalized.normalizedQuoteAtoms, expectedBaseAtoms, snapshot.bestAskX18),
      takerFeeBps: snapshot.params.takerFeeBps, fillOrKill: true, isMargin: false,
      exactBuySimulationPassed: !approvalRequired, fingerprint,
    };
  } catch (error) {
    if (error instanceof PreflightError) throw error;
    throw new PreflightError('SIMULATION_FAILED', error instanceof Error ? error.message : 'Kuru buy preparation failed.');
  }
}

export function serializeNativeBuyPreparation(value: NativeBuyPreparation): NativeBuyPreparationDto {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => typeof item === 'bigint' ? [key, item.toString()] : [key, item])) as NativeBuyPreparationDto;
}

export function hasExactApprovalEvent(logs: readonly Log[], owner: Address, spender: Address, amount: bigint): boolean {
  return logs.some((log) => {
    if (getAddress(log.address) !== getAddress(USDC_ADDRESS)) return false;
    try {
      const decoded = decodeEventLog({ abi: ERC20_APPROVAL_ABI, eventName: 'Approval', data: log.data, topics: log.topics });
      return getAddress(decoded.args.owner) === getAddress(owner) && getAddress(decoded.args.spender) === getAddress(spender) && decoded.args.value === amount;
    } catch { return false; }
  });
}
