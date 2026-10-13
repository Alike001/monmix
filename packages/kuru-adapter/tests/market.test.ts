import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Hex } from 'viem';
import {
  assertBboMatchesPackedBook,
  buildReadOnlyReview,
  classifyMarketStatus,
  decodePackedL2Book,
  EXPECTED_MARKET,
  KURU_MON_USDC_MARKET,
  MON_NATIVE_ADDRESS,
  priceRawToX18,
  quoteAtomsForBaseAtoms,
  USDC_ADDRESS,
  validateMarketParams,
  type MarketParams,
  type MarketSnapshot,
} from '../src/index.ts';

const word = (value: bigint) => value.toString(16).padStart(64, '0');
const packed = (...values: bigint[]): Hex => `0x${values.map(word).join('')}`;

const params: MarketParams = {
  pricePrecision: EXPECTED_MARKET.pricePrecision,
  sizePrecision: EXPECTED_MARKET.sizePrecision,
  baseAssetAddress: MON_NATIVE_ADDRESS,
  baseAssetDecimals: EXPECTED_MARKET.baseDecimals,
  quoteAssetAddress: USDC_ADDRESS,
  quoteAssetDecimals: EXPECTED_MARKET.quoteDecimals,
  tickSize: 100n,
  minSize: 2_000_000_000_000n,
  maxSize: 2_000_000_000_000_000_000n,
  takerFeeBps: 0n,
  makerFeeBps: 0n,
};

const fixture = packed(
  113_012_826n,
  2_460_700n,
  61_074_960_419_290n,
  2_460_000n,
  152_687_401_048_226n,
  0n,
  2_463_700n,
  61_074_960_419_290n,
  2_464_500n,
  152_687_401_048_226n,
  0n,
);

test('decodes packed block, bids and asks without floating point', () => {
  const book = decodePackedL2Book(fixture);
  assert.equal(book.blockNumber, 113_012_826n);
  assert.deepEqual(book.bids[0], { priceRaw: 2_460_700n, sizeRaw: 61_074_960_419_290n });
  assert.deepEqual(book.asks[0], { priceRaw: 2_463_700n, sizeRaw: 61_074_960_419_290n });
});

test('rejects malformed packed responses', () => {
  assert.throws(() => decodePackedL2Book('0x1234'), /payload length/);
  assert.throws(
    () => decodePackedL2Book(packed(100n, 2_460_000n)),
    /size|terminator/,
  );
  assert.throws(
    () => decodePackedL2Book(packed(100n, 2_460_000n, 10n, 0n, 2_470_000n, 10n, 0n, 1n)),
    /trailing/,
  );
});

test('normalizes packed price precision to the independent BBO x18 scale', () => {
  assert.equal(priceRawToX18(2_460_700n, 100_000_000n), 24_607_000_000_000_000n);
  assert.doesNotThrow(() =>
    assertBboMatchesPackedBook(
      24_607_000_000_000_000n,
      24_637_000_000_000_000n,
      decodePackedL2Book(fixture),
      100_000_000n,
    ),
  );
});

test('factor-of-ten price error is rejected before portfolio valuation', () => {
  assert.throws(
    () =>
      assertBboMatchesPackedBook(
        246_070_000_000_000_000n,
        246_370_000_000_000_000n,
        decodePackedL2Book(fixture),
        100_000_000n,
      ),
    /price scale mismatch/,
  );
  assert.equal(
    quoteAtomsForBaseAtoms(1_000_000_000_000_000_000n, 24_600_000_000_000_000n),
    24_600n,
  );
});

test('classifies zero liquidity and stale data without inventing a price', () => {
  assert.equal(classifyMarketStatus(1n, false, false), 'EMPTY');
  assert.equal(classifyMarketStatus(31n, true, true), 'STALE');
  assert.equal(classifyMarketStatus(30n, true, true), 'LIVE');
});

test('rejects unexpected market precision or token metadata', () => {
  validateMarketParams(params);
  assert.throws(
    () => validateMarketParams({ ...params, quoteAssetDecimals: 18n }),
    /quote decimals/,
  );
  assert.throws(
    () => validateMarketParams({ ...params, pricePrecision: 10_000_000n }),
    /price precision/,
  );
});

test('read-only review walks real precision-shaped depth and refuses insufficient depth', () => {
  const book = decodePackedL2Book(fixture);
  const snapshot: MarketSnapshot = {
    chainId: 143,
    marketAddress: KURU_MON_USDC_MARKET,
    params,
    book,
    bestBidX18: 24_607_000_000_000_000n,
    bestAskX18: 24_637_000_000_000_000n,
    midpointX18: 24_622_000_000_000_000n,
    observedAtSeconds: 1000n,
    ageSeconds: 1n,
    status: 'LIVE',
  };
  assert.deepEqual(buildReadOnlyReview(snapshot, 'BUY_BASE', 1_000_000n), {
    status: 'BLOCK',
    code: 'BELOW_MARKET_MINIMUM',
  });
  const review = buildReadOnlyReview(snapshot, 'BUY_BASE', 10_000_000n);
  assert.equal(review.status, 'REVIEW');
  if (review.status === 'REVIEW') {
    assert.equal(review.requestedQuoteAtoms, 10_000_000n);
    assert.ok(review.estimatedBaseAtoms > 400n * 10n ** 18n);
    assert.equal(review.levelsUsed, 1);
  }
  assert.deepEqual(buildReadOnlyReview(snapshot, 'BUY_BASE', 100_000_000_000n), {
    status: 'BLOCK',
    code: 'INSUFFICIENT_DEPTH',
  });
  assert.deepEqual(buildReadOnlyReview({ ...snapshot, status: 'STALE' }, 'BUY_BASE', 10_000_000n), {
    status: 'BLOCK',
    code: 'STALE_MARKET',
  });
});
