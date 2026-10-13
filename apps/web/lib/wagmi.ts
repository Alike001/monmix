'use client';

import { http, createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { monadMainnet, MONAD_MAINNET_RPC_URL } from '@monad-strategy/kuru-adapter';

export const wagmiConfig = createConfig({
  chains: [monadMainnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [monadMainnet.id]: http(
      process.env.NEXT_PUBLIC_MONAD_RPC_URL || MONAD_MAINNET_RPC_URL,
    ),
  },
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
