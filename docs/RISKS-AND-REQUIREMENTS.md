# Security, provenance, and hackathon requirements

## Cannot be claimed yet
- The read-only Kuru MON/USDC market and injected-wallet balance path are verified, but no executable trading authorization, approval, signed order, transaction, fill or cancellation has been verified.
- Policy evaluation in JS/TS is not an enforceable spending restriction. Do not let server-side policy replace onchain controls when unattended execution is enabled.
- Kuru's Relay trigger APIs exist in source, but supported trigger schemas, evaluation trust and deployed behavior are unverified.
- This product has no user interviews or confirmed retention/revenue; do not claim product market fit.

## Safety acceptance tests required for any real execution
- Authorized market and exact token contract selection; decimals and quote asset verified.
- Price freshness, controlled slippage/limit, minimum notional, adequate token balances and gas, sufficient book depth.
- Signatures bound to chain ID, account, market, exact order, nonce and expiry; no replay or malleability.
- Race between pause/revoke and an in-flight order; clear semantics for actions submitted before cancellation.
- No unlimited token approvals by default; transaction review clearly states allowance/custody effects.
- Trigger/keeper cannot move funds to an unapproved destination.
- User's withdrawal, cancel and revoke functions survive oracle outage and paused automation where possible.
- Event stream reconnect, orderbook consistency, reorg handling, partial fills, canceled orders, and crash recovery.
- Persist all broadcast attempts and prove no duplicate broadcast from one intended action.

## Metropolis rules to keep on the checklist
- One project, one primary track; existing user-supplied rules: Track 1.
- A working Monad mainnet or testnet product, public complete source, setup README, OSI license, documentation, genuine three-minute maximum demo.
- Substantial new work during hackathon, attribute any reused components, disclose AI coding tools.
- Need contract address or transaction hash for real chain interaction and clear Monad-specific benefit.
- Apply only to sponsor bounties whose integrations meaningfully satisfy their terms.
