import type { Hex } from 'viem';
import type { DepthLevel, PackedL2Book } from './types.ts';

function readWords(value: Hex): bigint[] {
  const data = value.slice(2);
  if (data.length === 0 || data.length % 64 !== 0) {
    throw new Error('Malformed Kuru L2 payload length');
  }
  const words: bigint[] = [];
  for (let offset = 0; offset < data.length; offset += 64) {
    words.push(BigInt(`0x${data.slice(offset, offset + 64)}`));
  }
  return words;
}

function readSide(
  words: bigint[],
  start: number,
  allowEndWithoutTerminator = false,
): { levels: DepthLevel[]; next: number } {
  const levels: DepthLevel[] = [];
  let cursor = start;
  while (cursor < words.length) {
    const priceRaw = words[cursor];
    if (priceRaw === undefined) throw new Error('Malformed Kuru L2 price');
    cursor += 1;
    if (priceRaw === 0n) return { levels, next: cursor };
    const sizeRaw = words[cursor];
    if (sizeRaw === undefined || sizeRaw === 0n) {
      throw new Error('Malformed Kuru L2 size');
    }
    cursor += 1;
    levels.push({ priceRaw, sizeRaw });
  }
  if (allowEndWithoutTerminator) return { levels, next: cursor };
  throw new Error('Missing Kuru L2 side terminator');
}

export function decodePackedL2Book(raw: Hex): PackedL2Book {
  const words = readWords(raw);
  const blockNumber = words[0];
  if (blockNumber === undefined || blockNumber === 0n) {
    throw new Error('Malformed Kuru L2 block number');
  }
  const bids = readSide(words, 1);
  // The deployed legacy contract terminates bids with zero. Some responses
  // end immediately after the final ask pair rather than appending a second zero.
  const asks = readSide(words, bids.next, true);
  if (asks.next !== words.length) throw new Error('Unexpected trailing Kuru L2 data');

  return {
    blockNumber,
    bids: bids.levels.sort((left, right) => (left.priceRaw > right.priceRaw ? -1 : 1)),
    asks: asks.levels.sort((left, right) => (left.priceRaw < right.priceRaw ? -1 : 1)),
    raw,
  };
}

export function priceRawToX18(priceRaw: bigint, pricePrecision: bigint): bigint {
  if (priceRaw < 0n || pricePrecision <= 0n) throw new RangeError('Invalid price precision');
  return (priceRaw * 10n ** 18n) / pricePrecision;
}

export function assertBboMatchesPackedBook(
  bestBidX18: bigint,
  bestAskX18: bigint,
  book: PackedL2Book,
  pricePrecision: bigint,
): void {
  if (book.bids.length === 0 && book.asks.length === 0) return;
  const topBid = book.bids[0];
  const topAsk = book.asks[0];
  if (!topBid || !topAsk || bestBidX18 <= 0n || bestAskX18 <= 0n) {
    throw new Error('Kuru BBO and packed book liquidity disagree');
  }
  const packedBidX18 = priceRawToX18(topBid.priceRaw, pricePrecision);
  const packedAskX18 = priceRawToX18(topAsk.priceRaw, pricePrecision);
  const withinOnePercent = (left: bigint, right: bigint) => {
    const difference = left > right ? left - right : right - left;
    return difference * 100n <= right;
  };
  if (!withinOnePercent(bestBidX18, packedBidX18) || !withinOnePercent(bestAskX18, packedAskX18)) {
    throw new Error('Kuru price scale mismatch between BBO and packed book');
  }
}
