import type { Address, Hex } from 'viem';

export interface DepthLevel {
  priceRaw: bigint;
  sizeRaw: bigint;
}

export interface PackedL2Book {
  blockNumber: bigint;
  bids: DepthLevel[];
  asks: DepthLevel[];
  raw: Hex;
}

export interface MarketParams {
  pricePrecision: bigint;
  sizePrecision: bigint;
  baseAssetAddress: Address;
  baseAssetDecimals: bigint;
  quoteAssetAddress: Address;
  quoteAssetDecimals: bigint;
  tickSize: bigint;
  minSize: bigint;
  maxSize: bigint;
  takerFeeBps: bigint;
  makerFeeBps: bigint;
}

export type MarketStatus = 'LIVE' | 'STALE' | 'EMPTY';

export interface MarketSnapshot {
  chainId: number;
  marketAddress: Address;
  params: MarketParams;
  book: PackedL2Book;
  bestBidX18: bigint;
  bestAskX18: bigint;
  midpointX18: bigint;
  observedAtSeconds: bigint;
  ageSeconds: bigint;
  status: MarketStatus;
}

export interface MarketSnapshotDto {
  chainId: number;
  marketAddress: Address;
  params: Record<keyof MarketParams, string>;
  book: {
    blockNumber: string;
    bids: Array<{ priceRaw: string; sizeRaw: string }>;
    asks: Array<{ priceRaw: string; sizeRaw: string }>;
  };
  bestBidX18: string;
  bestAskX18: string;
  midpointX18: string;
  observedAtSeconds: string;
  ageSeconds: string;
  status: MarketStatus;
}

export type ReadOnlyReview =
  | {
      status: 'BLOCK';
      code: 'STALE_MARKET' | 'NO_LIQUIDITY' | 'BELOW_MARKET_MINIMUM' | 'INSUFFICIENT_DEPTH';
    }
  | {
      status: 'REVIEW';
      side: 'BUY_BASE' | 'SELL_BASE';
      requestedQuoteAtoms: bigint;
      estimatedQuoteAtoms: bigint;
      estimatedBaseAtoms: bigint;
      worstPriceRaw: bigint;
      levelsUsed: number;
    };
