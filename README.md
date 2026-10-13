# Monad spot strategy desk - Phase 0 core

This is a small **original** deterministic portfolio-policy proof for the Shijima-inspired Monad project. It is **not yet a wallet application or a real trading product**. There is no network integration, contract deployment, scheduler, signing, token custody, or broadcasting.

## Run

Requires Node.js 22.16+ (no npm packages):

```bash
npm test
npm run example
```

## Financial assumptions

- All value amounts are converted to quote-token atomic units (e.g. stablecoin with 6 decimals) **by a trusted caller**. This package does not value assets or fetch balances. Conversion and asset decimals must be checked by the onchain/offchain adapters.
- The deterministic function proposes buy/sell/no action. It never signs or broadcasts, and its `REVIEW` status is not permission to execute.
- Threshold is share-of-portfolio drift in basis points, not price change.
- Per-action and daily caps are not enforced by this library against a malicious execution service. **Onchain or equivalently cryptographic binding enforcement is required** before unattended trading.
- A stale price is blocked rather than substituted with an estimate. A quote alone is not an execution guarantee.

## Next integration gates

1. Query and verify actual Kuru market address, balances, quote assets, decimals, and orderbook depth on Monad testnet/mainnet; no hardcoded guessed markets.
2. Verify SDK version, EIP-7702 operator authorization, relay trigger semantics, quote constraints, replay resistance, and revocation in a disposable wallet.
3. Add a read-only dashboard using actual data and a portfolio policy editor; preserve explicit `unconfigured` and `network unavailable` statuses.
4. Add a user-confirmed real spot trade through Kuru with tx/hash/receipt reconciliation.
5. Only then attempt unattended execution with user-owned limits enforced by a tested compatible mechanism.

See the source mapping and plan in `docs/` and the accompanying `monad-metropolis-context` folder.
