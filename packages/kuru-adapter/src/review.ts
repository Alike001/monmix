import type { MarketSnapshot, ReadOnlyReview } from './types.ts';

export function quoteAtomsForBaseAtoms(
  baseAtoms: bigint,
  priceX18: bigint,
  baseDecimals = 18n,
  quoteDecimals = 6n,
): bigint {
  if (baseAtoms < 0n || priceX18 < 0n) throw new RangeError('Negative valuation input');
  return (
    (baseAtoms * priceX18 * 10n ** quoteDecimals) /
    (10n ** baseDecimals * 10n ** 18n)
  );
}

export function buildReadOnlyReview(
  snapshot: MarketSnapshot,
  side: 'BUY_BASE' | 'SELL_BASE',
  requestedQuoteAtoms: bigint,
): ReadOnlyReview {
  if (requestedQuoteAtoms <= 0n) throw new RangeError('Review notional must be positive');
  if (snapshot.status === 'STALE') return { status: 'BLOCK', code: 'STALE_MARKET' };
  if (snapshot.status === 'EMPTY') return { status: 'BLOCK', code: 'NO_LIQUIDITY' };

  const minimumBaseAtoms =
    (snapshot.params.minSize * 10n ** snapshot.params.baseAssetDecimals) /
    snapshot.params.sizePrecision;
  const minimumQuoteAtoms = quoteAtomsForBaseAtoms(
    minimumBaseAtoms,
    snapshot.midpointX18,
    snapshot.params.baseAssetDecimals,
    snapshot.params.quoteAssetDecimals,
  );
  if (requestedQuoteAtoms < minimumQuoteAtoms) {
    return { status: 'BLOCK', code: 'BELOW_MARKET_MINIMUM' };
  }

  const levels = side === 'BUY_BASE' ? snapshot.book.asks : snapshot.book.bids;
  let remaining = requestedQuoteAtoms;
  let estimatedQuoteAtoms = 0n;
  let estimatedBaseAtoms = 0n;
  let worstPriceRaw = 0n;
  let levelsUsed = 0;

  for (const level of levels) {
    if (remaining === 0n) break;
    const baseCapacityAtoms =
      (level.sizeRaw * 10n ** snapshot.params.baseAssetDecimals) /
      snapshot.params.sizePrecision;
    const quoteCapacityAtoms =
      (level.sizeRaw * level.priceRaw * 10n ** snapshot.params.quoteAssetDecimals) /
      (snapshot.params.sizePrecision * snapshot.params.pricePrecision);
    if (quoteCapacityAtoms === 0n) continue;
    const quoteUsed = remaining < quoteCapacityAtoms ? remaining : quoteCapacityAtoms;
    const baseUsed = (baseCapacityAtoms * quoteUsed) / quoteCapacityAtoms;
    estimatedQuoteAtoms += quoteUsed;
    estimatedBaseAtoms += baseUsed;
    remaining -= quoteUsed;
    worstPriceRaw = level.priceRaw;
    levelsUsed += 1;
  }

  if (remaining > 0n) return { status: 'BLOCK', code: 'INSUFFICIENT_DEPTH' };
  return {
    status: 'REVIEW',
    side,
    requestedQuoteAtoms,
    estimatedQuoteAtoms,
    estimatedBaseAtoms,
    worstPriceRaw,
    levelsUsed,
  };
}
