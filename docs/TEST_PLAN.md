# Test plan

## Deterministic suites

- Preserve all 11 Phase 0 policy cases, including bounded random invariants.
- Exact power-of-ten and decimal parsing checks.
- Packed L2 happy path, truncation, missing size and trailing garbage.
- Price normalization at 1e8 to x18 and explicit rejection of a 10x BBO error.
- Fresh, stale and zero-liquidity classification.
- Wrong quote decimals and wrong price precision rejection.
- Read-only review, Kuru market minimum, insufficient depth and stale refusal.
- Wallet disconnected, wrong-network and ready state mapping.

## Integration check

`pnpm test:live` verifies chain ID, deployed market call, params, packed depth, BBO agreement and current block age through read-only RPC calls.

## Release gates

`pnpm test`, `pnpm test:live`, `pnpm typecheck`, `pnpm lint` and `pnpm build` must pass. A production server smoke test must return HTTP 200 for `/`, `/markets`, `/desk`, `/activity`, `/proof`, `/docs`, and `/api/market`.

## Manual wallet cases

- No injected provider: connect action remains unavailable or reports wallet absence.
- Wallet disconnected: no balance or policy result uses stale prior address data.
- Wrong chain: show chain mismatch and offer switch to 143; do not read a recommendation.
- Correct chain: read the public address's MON and USDC; never request a signature.
