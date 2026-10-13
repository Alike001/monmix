import { encodePacked, getAddress, keccak256, type Address, type Hex, type PublicClient } from 'viem';
import { ERC20_APPROVAL_ABI, ERC20_READ_ABI } from './abi.ts';
import { KURU_MON_USDC_MARKET, MONAD_MAINNET_CHAIN_ID, USDC_ADDRESS } from './addresses.ts';
import { PreflightError, verifyDeployedMarket } from './execution.ts';

export interface UsdcAllowanceStatus {
  chainId: 143;
  account: Address;
  tokenAddress: Address;
  spender: Address;
  allowanceAtoms: bigint;
  blockNumber: bigint;
  observedAtSeconds: bigint;
}

export interface UsdcRevocationPreparation extends UsdcAllowanceStatus {
  implementationAddress: Address;
  implementationCodeHash: Hex;
  targetAllowanceAtoms: 0n;
  gasEstimate: bigint;
  gasPriceWei: bigint;
  maximumGasCostWei: bigint;
  walletMonBalanceWei: bigint;
  expiresAtSeconds: bigint;
  fingerprint: Hex;
}

export type UsdcAllowanceStatusDto = {
  [K in keyof UsdcAllowanceStatus]: UsdcAllowanceStatus[K] extends bigint ? string : UsdcAllowanceStatus[K]
};

export type UsdcRevocationPreparationDto = {
  [K in keyof UsdcRevocationPreparation]: UsdcRevocationPreparation[K] extends bigint ? string : UsdcRevocationPreparation[K]
};

export async function readUsdcAllowanceStatus(client: PublicClient, owner: Address): Promise<UsdcAllowanceStatus> {
  const account = getAddress(owner);
  const [deployment, allowanceAtoms, decimals, symbol, blockNumber] = await Promise.all([
    verifyDeployedMarket(client),
    client.readContract({ address: USDC_ADDRESS, abi: ERC20_READ_ABI, functionName: 'allowance', args: [account, KURU_MON_USDC_MARKET] }),
    client.readContract({ address: USDC_ADDRESS, abi: ERC20_READ_ABI, functionName: 'decimals' }),
    client.readContract({ address: USDC_ADDRESS, abi: ERC20_READ_ABI, functionName: 'symbol' }),
    client.getBlockNumber(),
  ]);
  void deployment;
  if (decimals !== 6 || symbol !== 'USDC') throw new PreflightError('UNEXPECTED_MARKET', 'Configured allowance token is not the verified six-decimal USDC deployment.');
  const block = await client.getBlock({ blockNumber });
  return { chainId: 143, account, tokenAddress: USDC_ADDRESS, spender: KURU_MON_USDC_MARKET, allowanceAtoms, blockNumber, observedAtSeconds: block.timestamp };
}

export async function simulateUsdcAllowanceRevocation(
  client: PublicClient,
  account: Address,
): Promise<{ gasEstimate: bigint; gasPriceWei: bigint }> {
  const call = { account, address: USDC_ADDRESS, abi: ERC20_APPROVAL_ABI, functionName: 'approve' as const, args: [KURU_MON_USDC_MARKET, 0n] as const };
  try {
    await client.simulateContract(call);
    const [gasEstimate, gasPriceWei] = await Promise.all([client.estimateContractGas(call), client.getGasPrice()]);
    return { gasEstimate, gasPriceWei };
  } catch (error) {
    throw new PreflightError('SIMULATION_FAILED', error instanceof Error ? error.message : 'USDC allowance revocation simulation failed.');
  }
}

export async function prepareUsdcAllowanceRevocation(
  client: PublicClient,
  input: { account: Address; nowSeconds?: bigint },
): Promise<UsdcRevocationPreparation> {
  const nowSeconds = input.nowSeconds ?? BigInt(Math.floor(Date.now() / 1000));
  const account = getAddress(input.account);
  const [deployment, status, walletMonBalanceWei] = await Promise.all([
    verifyDeployedMarket(client),
    readUsdcAllowanceStatus(client, account),
    client.getBalance({ address: account }),
  ]);
  if (status.allowanceAtoms === 0n) throw new PreflightError('NO_ALLOWANCE', 'This wallet has no residual USDC allowance for the Kuru market.');
  const { gasEstimate, gasPriceWei } = await simulateUsdcAllowanceRevocation(client, account);
  const maximumGasCostWei = gasEstimate * gasPriceWei;
  if (walletMonBalanceWei < maximumGasCostWei) throw new PreflightError('INSUFFICIENT_MON', 'Wallet MON balance cannot cover the estimated allowance-revocation fee.');
  const expiresAtSeconds = nowSeconds + 20n;
  const fingerprint = keccak256(encodePacked(
    ['uint256', 'address', 'address', 'address', 'uint256', 'uint256'],
    [BigInt(MONAD_MAINNET_CHAIN_ID), account, USDC_ADDRESS, KURU_MON_USDC_MARKET, status.allowanceAtoms, status.blockNumber],
  ));
  return {
    ...status,
    implementationAddress: deployment.implementation,
    implementationCodeHash: deployment.codeHash,
    targetAllowanceAtoms: 0n,
    gasEstimate,
    gasPriceWei,
    maximumGasCostWei,
    walletMonBalanceWei,
    expiresAtSeconds,
    fingerprint,
  };
}

export function serializeUsdcAllowanceStatus(value: UsdcAllowanceStatus): UsdcAllowanceStatusDto {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => typeof item === 'bigint' ? [key, item.toString()] : [key, item])) as UsdcAllowanceStatusDto;
}

export function serializeUsdcRevocationPreparation(value: UsdcRevocationPreparation): UsdcRevocationPreparationDto {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => typeof item === 'bigint' ? [key, item.toString()] : [key, item])) as UsdcRevocationPreparationDto;
}
