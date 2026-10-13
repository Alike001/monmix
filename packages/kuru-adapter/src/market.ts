import {
  createPublicClient,
  fallback,
  getAddress,
  http,
  type Address,
  type PublicClient,
} from 'viem';
import { defineChain } from 'viem';
import {
  EXPECTED_MARKET,
  KURU_MON_USDC_MARKET,
  MONAD_EXPLORER_URL,
  MONAD_MAINNET_CHAIN_ID,
  MONAD_MAINNET_FALLBACK_RPC_URL,
  MONAD_MAINNET_RPC_URL,
  USDC_ADDRESS,
} from './addresses.ts';
import { ERC20_READ_ABI, KURU_ORDER_BOOK_ABI } from './abi.ts';
import { assertBboMatchesPackedBook, decodePackedL2Book } from './l2.ts';
import type {
  MarketParams,
  MarketSnapshot,
  MarketSnapshotDto,
  MarketStatus,
} from './types.ts';

export const monadMainnet = defineChain({
  id: MONAD_MAINNET_CHAIN_ID,
  name: 'Monad',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [MONAD_MAINNET_RPC_URL, MONAD_MAINNET_FALLBACK_RPC_URL] } },
  blockExplorers: { default: { name: 'Monadscan', url: MONAD_EXPLORER_URL } },
});

export function createMonadPublicClient(
  rpcUrl?: string,
  transportOptions: { timeout?: number; retryCount?: number } = {},
) {
  const options = {
    timeout: transportOptions.timeout ?? 8_000,
    retryCount: transportOptions.retryCount ?? 1,
  };
  return createPublicClient({
    chain: monadMainnet,
    transport: rpcUrl
      ? http(rpcUrl, options)
      : fallback([http(MONAD_MAINNET_RPC_URL, options), http(MONAD_MAINNET_FALLBACK_RPC_URL, options)]),
  });
}

export function classifyMarketStatus(
  ageSeconds: bigint,
  hasBids: boolean,
  hasAsks: boolean,
  maxAgeSeconds = 30n,
): MarketStatus {
  if (!hasBids || !hasAsks) return 'EMPTY';
  return ageSeconds > maxAgeSeconds ? 'STALE' : 'LIVE';
}

export function validateMarketParams(params: MarketParams): void {
  const checks: Array<[boolean, string]> = [
    [params.pricePrecision === EXPECTED_MARKET.pricePrecision, 'price precision'],
    [params.sizePrecision === EXPECTED_MARKET.sizePrecision, 'size precision'],
    [getAddress(params.baseAssetAddress) === getAddress(EXPECTED_MARKET.baseAsset), 'base asset'],
    [params.baseAssetDecimals === EXPECTED_MARKET.baseDecimals, 'base decimals'],
    [getAddress(params.quoteAssetAddress) === getAddress(EXPECTED_MARKET.quoteAsset), 'quote asset'],
    [params.quoteAssetDecimals === EXPECTED_MARKET.quoteDecimals, 'quote decimals'],
    [params.tickSize > 0n, 'tick size'],
    [params.minSize > 0n && params.maxSize >= params.minSize, 'size limits'],
  ];
  const failed = checks.find(([passes]) => !passes);
  if (failed) throw new Error(`Unexpected Kuru MON/USDC ${failed[1]}`);
}

export async function readMarketSnapshot(
  client: PublicClient,
  nowSeconds = BigInt(Math.floor(Date.now() / 1000)),
): Promise<MarketSnapshot> {
  const chainId = await client.getChainId();
  if (chainId !== MONAD_MAINNET_CHAIN_ID) {
    throw new Error(`Wrong RPC chain: expected ${MONAD_MAINNET_CHAIN_ID}, received ${chainId}`);
  }

  const [rawParams, rawBook, bbo] = await Promise.all([
    client.readContract({
      address: KURU_MON_USDC_MARKET,
      abi: KURU_ORDER_BOOK_ABI,
      functionName: 'getMarketParams',
    }),
    client.readContract({
      address: KURU_MON_USDC_MARKET,
      abi: KURU_ORDER_BOOK_ABI,
      functionName: 'getL2Book',
    }),
    client.readContract({
      address: KURU_MON_USDC_MARKET,
      abi: KURU_ORDER_BOOK_ABI,
      functionName: 'bestBidAsk',
    }),
  ]);

  const params: MarketParams = {
    pricePrecision: BigInt(rawParams[0]),
    sizePrecision: rawParams[1],
    baseAssetAddress: rawParams[2],
    baseAssetDecimals: BigInt(rawParams[3]),
    quoteAssetAddress: rawParams[4],
    quoteAssetDecimals: BigInt(rawParams[5]),
    tickSize: BigInt(rawParams[6]),
    minSize: rawParams[7],
    maxSize: rawParams[8],
    takerFeeBps: rawParams[9],
    makerFeeBps: rawParams[10],
  };
  validateMarketParams(params);

  const book = decodePackedL2Book(rawBook);
  const [bestBidX18, bestAskX18] = bbo;
  assertBboMatchesPackedBook(bestBidX18, bestAskX18, book, params.pricePrecision);

  const block = await client.getBlock({ blockNumber: book.blockNumber });
  const ageSeconds = nowSeconds > block.timestamp ? nowSeconds - block.timestamp : 0n;
  const status = classifyMarketStatus(
    ageSeconds,
    book.bids.length > 0,
    book.asks.length > 0,
  );

  return {
    chainId,
    marketAddress: KURU_MON_USDC_MARKET,
    params,
    book,
    bestBidX18,
    bestAskX18,
    midpointX18: bestBidX18 > 0n && bestAskX18 > 0n ? (bestBidX18 + bestAskX18) / 2n : 0n,
    observedAtSeconds: block.timestamp,
    ageSeconds,
    status,
  };
}

export async function readWalletBalances(client: PublicClient, owner: Address) {
  const [mon, usdc] = await Promise.all([
    client.getBalance({ address: owner }),
    client.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_READ_ABI,
      functionName: 'balanceOf',
      args: [owner],
    }),
  ]);
  return { mon, usdc };
}

export function serializeMarketSnapshot(snapshot: MarketSnapshot): MarketSnapshotDto {
  const params = Object.fromEntries(
    Object.entries(snapshot.params).map(([key, value]) => [key, value.toString()]),
  ) as Record<keyof MarketParams, string>;
  return {
    chainId: snapshot.chainId,
    marketAddress: snapshot.marketAddress,
    params,
    book: {
      blockNumber: snapshot.book.blockNumber.toString(),
      bids: snapshot.book.bids.map((level) => ({
        priceRaw: level.priceRaw.toString(),
        sizeRaw: level.sizeRaw.toString(),
      })),
      asks: snapshot.book.asks.map((level) => ({
        priceRaw: level.priceRaw.toString(),
        sizeRaw: level.sizeRaw.toString(),
      })),
    },
    bestBidX18: snapshot.bestBidX18.toString(),
    bestAskX18: snapshot.bestAskX18.toString(),
    midpointX18: snapshot.midpointX18.toString(),
    observedAtSeconds: snapshot.observedAtSeconds.toString(),
    ageSeconds: snapshot.ageSeconds.toString(),
    status: snapshot.status,
  };
}

export function deserializeMarketSnapshot(snapshot: MarketSnapshotDto): MarketSnapshot {
  const params = Object.fromEntries(
    Object.entries(snapshot.params).map(([key, value]) =>
      key.endsWith('Address') ? [key, value] : [key, BigInt(value)],
    ),
  ) as unknown as MarketParams;
  return {
    chainId: snapshot.chainId,
    marketAddress: snapshot.marketAddress,
    params,
    book: {
      blockNumber: BigInt(snapshot.book.blockNumber),
      bids: snapshot.book.bids.map((level) => ({
        priceRaw: BigInt(level.priceRaw),
        sizeRaw: BigInt(level.sizeRaw),
      })),
      asks: snapshot.book.asks.map((level) => ({
        priceRaw: BigInt(level.priceRaw),
        sizeRaw: BigInt(level.sizeRaw),
      })),
      raw: '0x',
    },
    bestBidX18: BigInt(snapshot.bestBidX18),
    bestAskX18: BigInt(snapshot.bestAskX18),
    midpointX18: BigInt(snapshot.midpointX18),
    observedAtSeconds: BigInt(snapshot.observedAtSeconds),
    ageSeconds: BigInt(snapshot.ageSeconds),
    status: snapshot.status,
  };
}
