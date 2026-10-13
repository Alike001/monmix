import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getWalletReadiness } from '../lib/wallet-state.ts';

test('wallet disconnection is explicit', () => {
  assert.equal(getWalletReadiness('disconnected', undefined, 143), 'DISCONNECTED');
  assert.equal(getWalletReadiness('connecting', undefined, 143), 'DISCONNECTED');
});

test('wrong network never becomes ready', () => {
  assert.equal(getWalletReadiness('connected', 1, 143), 'WRONG_NETWORK');
  assert.equal(getWalletReadiness('connected', 143, 143), 'READY');
});
