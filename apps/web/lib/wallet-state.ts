import { getAddress, isAddress, type Address } from 'viem';

export type WalletReadiness =
  | 'DISCONNECTED'
  | 'VERIFYING'
  | 'WRONG_NETWORK'
  | 'PROVIDER_MISMATCH'
  | 'READY';

export type ProviderWalletState = {
  chainId: number;
  accounts: readonly Address[];
};

export type ProviderConnector = {
  getProvider(): Promise<unknown>;
};

export type Eip1193Provider = {
  request(args: { method: string; params?: readonly unknown[] }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};

export function selectableWalletConnectors<T extends { id: string; rdns?: string | readonly string[] | undefined }>(connectors: readonly T[]): T[] {
  const named = connectors.filter((connector) => Boolean(connector.rdns));
  return named.length > 0 ? named : [...connectors];
}

export function isEip1193Provider(value: unknown): value is Eip1193Provider {
  return Boolean(value && typeof value === 'object' && typeof (value as Eip1193Provider).request === 'function');
}

export function parseProviderChainId(value: unknown): number {
  if (typeof value !== 'string' || !/^0x[0-9a-f]+$/i.test(value)) {
    throw new Error('Selected wallet returned an invalid eth_chainId.');
  }
  const chainId = Number.parseInt(value.slice(2), 16);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error('Selected wallet returned an invalid eth_chainId.');
  }
  return chainId;
}

export function parseProviderAccounts(value: unknown): readonly Address[] {
  if (!Array.isArray(value) || value.some((account) => typeof account !== 'string' || !isAddress(account))) {
    throw new Error('Selected wallet returned invalid eth_accounts.');
  }
  return value.map((account) => getAddress(account));
}

export async function readProviderWalletState(connector: ProviderConnector | undefined): Promise<ProviderWalletState> {
  if (!connector) throw new Error('The active wallet connector is unavailable.');
  const provider = await connector.getProvider();
  if (!isEip1193Provider(provider)) throw new Error('The selected wallet provider is unavailable.');
  const [chainId, accounts] = await Promise.all([
    provider.request({ method: 'eth_chainId' }),
    provider.request({ method: 'eth_accounts' }),
  ]);
  return {
    chainId: parseProviderChainId(chainId),
    accounts: parseProviderAccounts(accounts),
  };
}

export function getWalletReadiness(input: {
  status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
  wagmiAddress?: Address | undefined;
  wagmiChainId?: number | undefined;
  provider?: ProviderWalletState | undefined;
  requiredChainId: number;
}): WalletReadiness {
  if (input.status !== 'connected' || !input.wagmiAddress) return 'DISCONNECTED';
  if (!input.provider) return 'VERIFYING';
  if (input.provider.chainId !== input.requiredChainId) return 'WRONG_NETWORK';
  if (input.wagmiChainId !== input.provider.chainId) return 'PROVIDER_MISMATCH';
  const wagmiAddress = getAddress(input.wagmiAddress);
  if (input.provider.accounts.length === 0 || getAddress(input.provider.accounts[0]!) !== wagmiAddress) {
    return 'PROVIDER_MISMATCH';
  }
  return 'READY';
}

export function assertWalletExecutionContext(
  connection: { status: string; address?: Address | undefined; chainId?: number | undefined },
  preparation: { account: Address; chainId: number; expiresAtSeconds: string },
  nowSeconds = BigInt(Math.floor(Date.now() / 1000)),
  provider?: ProviderWalletState,
): void {
  if (connection.status !== 'connected' || !connection.address) throw new Error('Wallet disconnected after preparation.');
  if (!provider) throw new Error('Selected wallet provider was not verified after preparation.');
  if (provider.chainId !== preparation.chainId || connection.chainId !== provider.chainId) {
    throw new Error('Wallet network changed after preparation.');
  }
  if (provider.accounts.length === 0 || getAddress(provider.accounts[0]!) !== getAddress(connection.address)) {
    throw new Error('Selected provider account does not match the connected wallet.');
  }
  if (getAddress(connection.address) !== getAddress(preparation.account)) throw new Error('Wallet account changed after preparation.');
  if (BigInt(preparation.expiresAtSeconds) < nowSeconds) throw new Error('Preparation expired before wallet confirmation.');
}
