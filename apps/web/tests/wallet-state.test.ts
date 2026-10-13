import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertWalletExecutionContext, getWalletReadiness } from '../lib/wallet-state.ts';

test('wallet disconnection is explicit', () => {
  assert.equal(getWalletReadiness('disconnected', undefined, 143), 'DISCONNECTED');
  assert.equal(getWalletReadiness('connecting', undefined, 143), 'DISCONNECTED');
});

test('execution context refuses account switches, network switches and expired preparations', () => {
  const prepared = { account: '0x1111111111111111111111111111111111111111' as const, chainId: 143, expiresAtSeconds: '200' };
  assert.doesNotThrow(() => assertWalletExecutionContext({ status: 'connected', address: prepared.account, chainId: 143 }, prepared, 199n));
  assert.throws(() => assertWalletExecutionContext({ status: 'connected', address: '0x2222222222222222222222222222222222222222', chainId: 143 }, prepared, 199n), /account changed/);
  assert.throws(() => assertWalletExecutionContext({ status: 'connected', address: prepared.account, chainId: 1 }, prepared, 199n), /network changed/);
  assert.throws(() => assertWalletExecutionContext({ status: 'disconnected' }, prepared, 199n), /disconnected/);
  assert.throws(() => assertWalletExecutionContext({ status: 'connected', address: prepared.account, chainId: 143 }, prepared, 201n), /expired/);
});

test('wrong network never becomes ready', () => {
  assert.equal(getWalletReadiness('connected', 1, 143), 'WRONG_NETWORK');
  assert.equal(getWalletReadiness('connected', 143, 143), 'READY');
});
