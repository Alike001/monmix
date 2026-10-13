import { createMonadPublicClient } from '@monad-strategy/kuru-adapter';

export const publicClient = createMonadPublicClient(
  process.env.NEXT_PUBLIC_MONAD_RPC_URL || process.env.MONAD_RPC_URL,
);
