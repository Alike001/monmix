export type WalletReadiness = 'DISCONNECTED' | 'WRONG_NETWORK' | 'READY';

export function getWalletReadiness(
  status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected',
  chainId: number | undefined,
  requiredChainId: number,
): WalletReadiness {
  if (status !== 'connected') return 'DISCONNECTED';
  return chainId === requiredChainId ? 'READY' : 'WRONG_NETWORK';
}
