# Source review: what to reuse conceptually, and what to implement ourselves
Reviewed public GitHub default branches October 10, 2026. Interfaces can change; pin SHAs/versions before development.

> Status update, 2026-10-13: pinned SHAs, licenses and deployed read compatibility are recorded in `THIRD_PARTY_NOTICES.md` and `INTEGRATIONS.md`. This document remains the architectural research map.

## Shijima: financial control and worker
- `Blockchain-Oracle/shijima/contracts/src/Desk.sol`: owner/operator distinction, per-action/daily spending caps, token and venue allowlists, bounded oracle deviation, pause/withdraw/revoke.
- `Blockchain-Oracle/shijima/contracts/src/DeskFactory.sol`: per-user isolated desk creation (do not copy chain deployment design uncritically).
- `Blockchain-Oracle/shijima/apps/worker/src/sender.ts`: write-ahead records signed hash and nonce before broadcasting, and recovers unsettled sends by checking chain outcomes.
- `Blockchain-Oracle/shijima/apps/worker/src/review.ts`: idempotent scheduled checks, single active pass, no concurrent signing under one operator key.
- `Blockchain-Oracle/shijima/packages/core/src/wake/decide.ts`: AI decisions never bypass independent validation; failure means no trade.
- `Blockchain-Oracle/shijima/apps/web/features/home/Landing.tsx`: landing statistics obtained from actual data sources, not hardcoded success claims.
- LICENSE is MIT (copyright 2026 Abubakr Jimoh); original code may be used under MIT terms with proper notices, but our hackathon requires substantially new work. Prefer independent implementation.

## Masayume: readable market UX and isolated boundaries
- `Blockchain-Oracle/masayume/packages/markets/src/runtime` and `/provider`: read-only market data separate from signer.
- `Blockchain-Oracle/masayume/packages/markets/src/submitter`: quote/review/send states.
- `Blockchain-Oracle/masayume/web/src/features/markets/MarketsPage.tsx`: compositional market screen and ticket surface.
- `Blockchain-Oracle/masayume/web/src/features/recovery`: explicit write recovery flow.
- `Blockchain-Oracle/masayume/services/ops/src/actors/strategy-runner`: separation between user interface and persistent execution actors.
- `THIRD_PARTY_NOTICES.md` explicitly warns that Masayume as a whole has no inferred repository-wide license. **Do not copy Masayume frontend code, custom art, music, typography assets, or proprietary copy.** Independently implement UX principles, with original design.

## Monad Kuru: supported protocol integration
- `Kuru-Labs/ts-sdk/README.md`: viem-first package; npm name currently documented as `@toxicflow-labs/ts-sdk`.
- `Kuru-Labs/ts-sdk/src/trading-wallet`: EIP-712 signed intents, EIP-7702 wallet authorizations, nonce and deadline binding.
- `Kuru-Labs/ts-sdk/docs/relay.md`: signed intents and Relay authentication/REST; BROADCAST is not transaction success.
- `Kuru-Labs/ts-sdk/src/trading-wallet/intents.ts` and `examples/relay/create-replace-trigger.ts`: typed trigger-related signed-intent support, but the trigger service's conditions and enforcement model must be confirmed before using for unattended trading.
- `Kuru-Labs/kuru-sdk-py/README.md`: reference market-making bot; orders consume deposited margin account balance, not necessarily wallet balances.

## Original architecture for Monad
- `packages/domain`: deterministic portfolio policy, pure math, state machine and safety reason codes.
- `packages/kuru-adapter`: read-only market and holdings, SDK wrapper; no signed action until network tests pass.
- `apps/web`: original UI (Next.js, Tailwind, wagmi/viem); no server-held user wallet keys.
- `apps/worker` (only after execution gate): one serialized signer lane, write-ahead journal, chain reconciliation, durable authorization and revocation state.
- `contracts` (only if necessary): a compatibility-tested per-owner policy gate with withdrawal rights and trading caps. Cannot simply assume Shijima Desk will route through Kuru.
- `apps/indexer` or Envio (if needed): durable trade and balance history with chain ID/block/tx index provenance.

## Key open technical gates
1. Exact Kuru mainnet/testnet market address, decimals, liquidity, minimums, order fee structure.
2. SDK `@toxicflow-labs/ts-sdk` package and contract ABI compatibility with current deployment.
3. EIP-7702 and AccountCore TRADE permission scope, expiry, revocation, upper notional limits.
4. Does a Kuru trigger relay enforce price conditions and prevent duplicate execution after crashes? Contract checks vs service-only checks must be distinguished.
5. Can a per-owner policy contract call supported Kuru actions without dangerous authority or custody semantics?
6. How to ensure owner's manual withdrawals and cancels remain available when automation pauses or oracles fail.
7. Plan execution performance under Monad block finality and Kuru orderbook consistency.

All source references are research evidence, not confirmation of a live integration with this starter.
