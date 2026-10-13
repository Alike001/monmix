import type { Address } from 'viem';

export const MONAD_MAINNET_CHAIN_ID = 143;
export const MONAD_MAINNET_RPC_URL = 'https://rpc.monad.xyz';
export const MONAD_EXPLORER_URL = 'https://monadscan.com';

export const KURU_MON_USDC_MARKET: Address = '0x065C9d28E428A0db40191a54d33d5b7c71a9C394';
export const MON_NATIVE_ADDRESS: Address = '0x0000000000000000000000000000000000000000';
export const USDC_ADDRESS: Address = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603';

export const EXPECTED_MARKET = {
  chainId: MONAD_MAINNET_CHAIN_ID,
  market: KURU_MON_USDC_MARKET,
  baseAsset: MON_NATIVE_ADDRESS,
  baseDecimals: 18n,
  quoteAsset: USDC_ADDRESS,
  quoteDecimals: 6n,
  pricePrecision: 100_000_000n,
  sizePrecision: 10_000_000_000n,
} as const;
