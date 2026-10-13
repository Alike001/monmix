import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateRebalance } from '@monad-strategy/domain';
import { ALLOCATION_PRESETS, allocationBps, marketMinimumQuoteAtoms, presetForTarget, quoteFreshness } from '../lib/allocation.ts';
import { DEFAULT_STRATEGY_PREFERENCES } from '../lib/strategy-preferences.ts';

test('allocation presets are explicit, editable starting points', () => {
  assert.deepEqual(ALLOCATION_PRESETS.map((item) => item.monPercent), ['50', '70', '30']);
  assert.equal(presetForTarget('70'), 'mon-forward');
  assert.equal(presetForTarget('61'), 'custom');
});

test('portfolio allocation uses bigint floor rounding without exceeding 100%', () => {
  assert.equal(allocationBps(1n, 2n), 3_333n);
  assert.equal(allocationBps(0n, 0n), 0n);
  assert.equal(allocationBps(5n, 0n), 10_000n);
  assert.throws(() => allocationBps(-1n, 2n));
});

test('200 MON minimum value does not inherit the old arbitrary five-dollar policy floor', () => {
  const midpointX18 = 24_000_000_000_000_000n; // $0.024; a 200 MON order is $4.80.
  assert.equal(marketMinimumQuoteAtoms(200n * 10n ** 18n, midpointX18), 4_800_000n);
  assert.equal(DEFAULT_STRATEGY_PREFERENCES.minimumTrade, '0.000001');
  const common = {
    baseValueQuoteAtoms: 20_000_000n, cashQuoteAtoms: 0n, targetBaseBps: 5_000n, triggerDriftBps: 0n,
    perActionCapQuoteAtoms: 4_800_000n, dailyCapQuoteAtoms: 50_000_000n, usedTodayQuoteAtoms: 0n,
    nowSeconds: 10n, lastPriceUpdateSeconds: 10n, maxPriceAgeSeconds: 30n, paused: false,
  };
  assert.equal(evaluateRebalance({ ...common, minimumTradeQuoteAtoms: 5_000_000n }).status, 'BLOCK');
  assert.equal(evaluateRebalance({ ...common, minimumTradeQuoteAtoms: 1n }).status, 'REVIEW');
});

test('quote freshness has exact expiry boundaries', () => {
  assert.equal(quoteFreshness(120n, 100n), 'FRESH');
  assert.equal(quoteFreshness(105n, 100n), 'EXPIRING');
  assert.equal(quoteFreshness(100n, 100n), 'EXPIRED');
});
