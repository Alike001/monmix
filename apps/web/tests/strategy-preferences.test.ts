import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_STRATEGY_PREFERENCES, readStrategyPreferences, saveStrategyPreferences } from '../lib/strategy-preferences.ts';

test('strategy preferences persist locally and remain advisory data', () => {
  let stored: string | null = null;
  const storage = { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } };
  const changed = { ...DEFAULT_STRATEGY_PREFERENCES, target: '72', paused: true };
  saveStrategyPreferences(storage, changed);
  assert.deepEqual(readStrategyPreferences(storage), changed);
});

test('malformed preferences fall back without contaminating policy inputs', () => {
  assert.deepEqual(readStrategyPreferences({ getItem: () => '{"target":12}' }), DEFAULT_STRATEGY_PREFERENCES);
  assert.deepEqual(readStrategyPreferences({ getItem: () => 'broken' }), DEFAULT_STRATEGY_PREFERENCES);
});

test('first-run policy leaves venue minimum independent from browser preference', () => {
  assert.equal(DEFAULT_STRATEGY_PREFERENCES.target, '50');
  assert.equal(DEFAULT_STRATEGY_PREFERENCES.minimumTrade, '0.000001');
  assert.equal(DEFAULT_STRATEGY_PREFERENCES.preset, 'balanced');
});
