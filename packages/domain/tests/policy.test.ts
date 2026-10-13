import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRebalance, type PolicyInput } from '../src/policy.ts';

const A = 1_000_000n;
const baseline: PolicyInput = {
  baseValueQuoteAtoms: 60n * A,
  cashQuoteAtoms: 40n * A,
  targetBaseBps: 6000n,
  triggerDriftBps: 500n,
  perActionCapQuoteAtoms: 15n * A,
  dailyCapQuoteAtoms: 25n * A,
  usedTodayQuoteAtoms: 0n,
  minimumTradeQuoteAtoms: 1n * A,
  nowSeconds: 1000n,
  lastPriceUpdateSeconds: 990n,
  maxPriceAgeSeconds: 60n,
  paused: false,
};

test('no trade when allocation matches target', () =>
  assert.deepEqual(evaluateRebalance(baseline), {
    status: 'WAIT',
    code: 'IN_BAND',
    driftBps: 0n,
  }));

test('proposes bounded buy when base falls below target', () => {
  const result = evaluateRebalance({
    ...baseline,
    baseValueQuoteAtoms: 40n * A,
    cashQuoteAtoms: 60n * A,
  });
  assert.equal(result.status, 'REVIEW');
  if (result.status === 'REVIEW') {
    assert.equal(result.side, 'BUY_BASE');
    assert.equal(result.quoteNotional, 15n * A);
  }
});

test('proposes bounded sell when base exceeds target', () => {
  const result = evaluateRebalance({
    ...baseline,
    baseValueQuoteAtoms: 80n * A,
    cashQuoteAtoms: 20n * A,
  });
  assert.equal(result.status, 'REVIEW');
  if (result.status === 'REVIEW') {
    assert.equal(result.side, 'SELL_BASE');
    assert.equal(result.quoteNotional, 15n * A);
  }
});

test('blocks stale prices', () =>
  assert.equal(evaluateRebalance({ ...baseline, lastPriceUpdateSeconds: 800n }).status, 'BLOCK'));
test('blocks paused strategies', () =>
  assert.deepEqual(evaluateRebalance({ ...baseline, paused: true }), {
    status: 'BLOCK',
    code: 'PAUSED',
    driftBps: 0n,
  }));
test('blocks expired daily budget', () =>
  assert.equal(
    evaluateRebalance({
      ...baseline,
      baseValueQuoteAtoms: 40n * A,
      cashQuoteAtoms: 60n * A,
      usedTodayQuoteAtoms: 25n * A,
    }).status,
    'BLOCK',
  ));
test('enforces minimum order size', () =>
  assert.equal(
    evaluateRebalance({
      ...baseline,
      baseValueQuoteAtoms: 40n * A,
      cashQuoteAtoms: 60n * A,
      perActionCapQuoteAtoms: 100_000n,
    }).status,
    'BLOCK',
  ));
test('rejects impossible allocation', () =>
  assert.throws(() => evaluateRebalance({ ...baseline, targetBaseBps: 10_001n }), RangeError));
test('rejects future price timestamp', () =>
  assert.throws(
    () => evaluateRebalance({ ...baseline, lastPriceUpdateSeconds: 1001n }),
    RangeError,
  ));
test('proposed buy never exceeds cash', () => {
  const result = evaluateRebalance({
    ...baseline,
    baseValueQuoteAtoms: 2n * A,
    cashQuoteAtoms: 3n * A,
    targetBaseBps: 9000n,
  });
  assert.equal(result.status, 'REVIEW');
  if (result.status === 'REVIEW') {
    assert.ok(result.quoteNotional <= 3n * A);
    assert.equal(result.quoteNotional, 2_500_000n);
  }
});

test('bounded decision invariants across 1000 deterministic portfolio snapshots', () => {
  let seed = 716_291_321n;
  const random = (limit: bigint) => {
    seed = (seed * 1_103_515_245n + 12_345n) % 2_147_483_648n;
    return seed % limit;
  };
  for (let index = 0; index < 1000; index += 1) {
    const base = random(1000n) * A;
    const cash = random(1000n) * A;
    const perAction = (1n + random(1000n)) * A;
    const daily = (1n + random(1000n)) * A;
    const used = random(1000n) * A;
    const policy: PolicyInput = {
      ...baseline,
      baseValueQuoteAtoms: base,
      cashQuoteAtoms: cash,
      targetBaseBps: random(10_001n),
      triggerDriftBps: random(500n),
      perActionCapQuoteAtoms: perAction,
      dailyCapQuoteAtoms: daily,
      usedTodayQuoteAtoms: used,
      minimumTradeQuoteAtoms: 1n,
    };
    const result = evaluateRebalance(policy);
    if (result.status === 'REVIEW') {
      assert.ok(result.quoteNotional > 0n);
      assert.ok(result.quoteNotional <= perAction);
      assert.ok(result.quoteNotional <= daily - used);
      assert.ok(result.quoteNotional <= (result.side === 'BUY_BASE' ? cash : base));
    }
  }
});
