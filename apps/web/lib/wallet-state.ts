export type WalletReadiness = 'DISCONNECTED' | 'WRONG_NETWORK' | 'READY';

export function getWalletReadiness(
  status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected',
  chainId: number | undefined,
  requiredChainId: number,
): WalletReadiness {
  if (status !== 'connected') return 'DISCONNECTED';
  return chainId === requiredChainId ? 'READY' : 'WRONG_NETWORK';
}
import { getAddress, type Address } from 'viem';


export function assertWalletExecutionContext(
  connection: { status: string; address?: Address | undefined; chainId?: number | undefined },
  preparation: { account: Address; chainId: number; expiresAtSeconds: string },
  nowSeconds = BigInt(Math.floor(Date.now() / 1000)),
): void {
  if (connection.status !== 'connected' || !connection.address) throw new Error('Wallet disconnected after preparation.');
  if (connection.chainId !== preparation.chainId) throw new Error('Wallet network changed after preparation.');
  if (getAddress(connection.address) !== getAddress(preparation.account)) throw new Error('Wallet account changed after preparation.');
  if (BigInt(preparation.expiresAtSeconds) < nowSeconds) throw new Error('Preparation expired before wallet confirmation.');
}
