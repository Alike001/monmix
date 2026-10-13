import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatAtoms, parseDecimalToAtoms, powerOfTenDecimals } from '../src/units.ts';

test('derives exact power-of-ten decimals', () => {
  assert.equal(powerOfTenDecimals(100_000_000n), 8);
  assert.equal(powerOfTenDecimals(10_000_000_000n), 10);
  assert.throws(() => powerOfTenDecimals(25n), RangeError);
});

test('parses and formats decimal atoms without floating point', () => {
  assert.equal(parseDecimalToAtoms('15.25', 6), 15_250_000n);
  assert.equal(formatAtoms(15_250_000n, 6, 2), '15.25');
  assert.throws(() => parseDecimalToAtoms('0.0000001', 6), RangeError);
});
