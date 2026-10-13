import type { Address } from 'viem';

export const MONAD_MAINNET_CHAIN_ID = 143;
export const MONAD_MAINNET_RPC_URL = 'https://rpc.monad.xyz';
export const MONAD_MAINNET_FALLBACK_RPC_URL = 'https://rpc-mainnet.monadinfra.com';
export const MONAD_EXPLORER_URL = 'https://monadscan.com';

export const KURU_MON_USDC_MARKET: Address = '0x065C9d28E428A0db40191a54d33d5b7c71a9C394';
export const KURU_MON_USDC_IMPLEMENTATION: Address = '0x5e3446c600524be453bbcefd46a9e4c9be8899a0';
export const KURU_MON_USDC_IMPLEMENTATION_CODE_HASH = '0x6576ced90ca537c9aa058ea4a54ab5edd802ab78b834168b21fcc6d9ac392c0c' as const;
export const EIP1967_IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' as const;
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
