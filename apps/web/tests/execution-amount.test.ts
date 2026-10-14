import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBoundedSellAmount } from '../lib/execution-amount.ts';

const minimum = 200n * 10n ** 18n;
const recommendation = 202n * 10n ** 18n;

test('owner can select exactly 200 MON only within an eligible sell recommendation', () => {
  assert.equal(resolveBoundedSellAmount({ mode: 'VENUE_MINIMUM', recommendedBaseAtoms: recommendation, declaredMinimumBaseAtoms: minimum }), minimum);
  assert.equal(resolveBoundedSellAmount({ mode: 'STRATEGY_RECOMMENDATION', recommendedBaseAtoms: recommendation, declaredMinimumBaseAtoms: minimum }), recommendation);
});

test('exact minimum selection cannot enlarge or rescue an ineligible recommendation', () => {
  assert.throws(() => resolveBoundedSellAmount({ mode: 'VENUE_MINIMUM', recommendedBaseAtoms: minimum - 1n, declaredMinimumBaseAtoms: minimum }), /below the venue minimum/);
  assert.throws(() => resolveBoundedSellAmount({ mode: 'VENUE_MINIMUM', recommendedBaseAtoms: 0n, declaredMinimumBaseAtoms: minimum }), /must be positive/);
});
