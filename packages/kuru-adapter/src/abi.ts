import { parseAbi } from 'viem';

/** Minimal ABI for the verified deployed legacy Kuru MON/USDC order book. */
export const KURU_ORDER_BOOK_ABI = parseAbi([
  'function getMarketParams() view returns (uint32 pricePrecision, uint96 sizePrecision, address baseAssetAddress, uint256 baseAssetDecimals, address quoteAssetAddress, uint256 quoteAssetDecimals, uint32 tickSize, uint96 minSize, uint96 maxSize, uint256 takerFeeBps, uint256 makerFeeBps)',
  'function getL2Book() view returns (bytes)',
  'function bestBidAsk() view returns (uint256 bid, uint256 ask)',
]);

export const ERC20_READ_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]);
