# Milestone 1 product specification

## User outcome

A Monad spot holder can inspect a real Kuru MON/USDC market, connect an injected wallet, see real balances, set a target MON allocation and advisory limits, and receive an explainable read-only review in under 30 seconds.

## Requirements

- Public market browsing without a wallet.
- Chain 143, deployed market, token address, decimals and precision validation.
- Packed L2 decoding, freshness classification and independent BBO scale comparison.
- Injected-wallet connection and explicit wrong-network state.
- Native MON and USDC balance reads.
- Integer-only target allocation with `WAIT`, `BLOCK`, and `REVIEW` outputs.
- Venue-depth estimate that blocks stale, empty, below-minimum and insufficient-depth cases.
- Honest activity and proof routes with no implied transaction evidence.
- Responsive original visual system and accessible semantic controls.

## Non-goals

Transaction preparation, approval, signing, broadcasting, automation, custody, server keys, smart contracts, AI trading, multi-market routing, price prediction and fabricated history are outside Milestone 1.

## Done

All public routes render in a production build; deterministic tests, live read-only probe, typecheck and lint pass; no write capability exists in the application source.
