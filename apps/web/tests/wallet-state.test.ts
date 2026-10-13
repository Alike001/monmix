import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertWalletExecutionContext,
  getWalletReadiness,
  parseProviderAccounts,
  parseProviderChainId,
  readProviderWalletState,
  selectableWalletConnectors,
} from '../lib/wallet-state.ts';

const account = '0x1111111111111111111111111111111111111111' as const;
const otherAccount = '0x2222222222222222222222222222222222222222' as const;
const providerState = { chainId: 143, accounts: [account] } as const;

test('wallet stays disconnected or verifying until the selected provider is read', () => {
  assert.equal(getWalletReadiness({ status: 'disconnected', requiredChainId: 143 }), 'DISCONNECTED');
  assert.equal(getWalletReadiness({ status: 'connecting', requiredChainId: 143 }), 'DISCONNECTED');
  assert.equal(getWalletReadiness({ status: 'connected', wagmiAddress: account, wagmiChainId: 143, requiredChainId: 143 }), 'VERIFYING');
});

test('actual provider chain is authoritative for wrong-network readiness', () => {
  assert.equal(getWalletReadiness({ status: 'connected', wagmiAddress: account, wagmiChainId: 143, provider: { chainId: 1, accounts: [account] }, requiredChainId: 143 }), 'WRONG_NETWORK');
  assert.equal(getWalletReadiness({ status: 'connected', wagmiAddress: account, wagmiChainId: 1, provider: { chainId: 143, accounts: [account] }, requiredChainId: 143 }), 'PROVIDER_MISMATCH');
  assert.equal(getWalletReadiness({ status: 'connected', wagmiAddress: account, wagmiChainId: 143, provider: providerState, requiredChainId: 143 }), 'READY');
});

test('provider account changes and missing accounts fail closed', () => {
  assert.equal(getWalletReadiness({ status: 'connected', wagmiAddress: account, wagmiChainId: 143, provider: { chainId: 143, accounts: [otherAccount] }, requiredChainId: 143 }), 'PROVIDER_MISMATCH');
  assert.equal(getWalletReadiness({ status: 'connected', wagmiAddress: account, wagmiChainId: 143, provider: { chainId: 143, accounts: [] }, requiredChainId: 143 }), 'PROVIDER_MISMATCH');
});

test('multiple EIP-6963 wallets replace the ambiguous generic injected connector', () => {
  const generic = { id: 'injected', name: 'Injected', uid: 'generic' };
  const metaMask = { id: 'io.metamask', name: 'MetaMask', uid: 'metamask', rdns: 'io.metamask' };
  const rabby = { id: 'io.rabby', name: 'Rabby', uid: 'rabby', rdns: 'io.rabby' };
  assert.deepEqual(selectableWalletConnectors([generic]), [generic]);
  assert.deepEqual(selectableWalletConnectors([generic, metaMask, rabby]), [metaMask, rabby]);
});

test('provider RPC values are parsed strictly and read without requesting permissions', async () => {
  const methods: string[] = [];
  const value = await readProviderWalletState({ getProvider: async () => ({
    request: async ({ method }: { method: string }) => {
      methods.push(method);
      return method === 'eth_chainId' ? '0x8f' : [account];
    },
  }) });
  assert.deepEqual(value, providerState);
  assert.deepEqual(methods.sort(), ['eth_accounts', 'eth_chainId']);
  assert.equal(parseProviderChainId('0x8f'), 143);
  assert.deepEqual(parseProviderAccounts([account.toLowerCase()]), [account]);
  assert.throws(() => parseProviderChainId('143'), /invalid eth_chainId/);
  assert.throws(() => parseProviderAccounts(['not-an-address']), /invalid eth_accounts/);
});

test('execution context refuses provider, account, network and expiry changes', () => {
  const prepared = { account, chainId: 143, expiresAtSeconds: '200' };
  assert.doesNotThrow(() => assertWalletExecutionContext({ status: 'connected', address: account, chainId: 143 }, prepared, 199n, providerState));
  assert.throws(() => assertWalletExecutionContext({ status: 'connected', address: account, chainId: 143 }, prepared, 199n), /provider was not verified/);
  assert.throws(() => assertWalletExecutionContext({ status: 'connected', address: otherAccount, chainId: 143 }, prepared, 199n, { chainId: 143, accounts: [otherAccount] }), /account changed/);
  assert.throws(() => assertWalletExecutionContext({ status: 'connected', address: account, chainId: 1 }, prepared, 199n, { chainId: 1, accounts: [account] }), /network changed/);
  assert.throws(() => assertWalletExecutionContext({ status: 'connected', address: account, chainId: 143 }, prepared, 199n, { chainId: 143, accounts: [otherAccount] }), /does not match/);
  assert.throws(() => assertWalletExecutionContext({ status: 'disconnected' }, prepared, 199n, providerState), /disconnected/);
  assert.throws(() => assertWalletExecutionContext({ status: 'connected', address: account, chainId: 143 }, prepared, 201n, providerState), /expired/);
});
