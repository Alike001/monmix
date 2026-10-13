# Opt-in read-only strategy watcher feasibility

Status: design only. It is not implemented, deployed, scheduled or represented as active monitoring.

## User value and boundary

An opted-in user could receive a notification when the observed MON/USDC allocation drifts far enough from their saved target to merit a review. The watcher would never hold a key, request an allowance, sign, submit or retry a transaction. A notification would deep-link back to the desk, where the wallet, market and deterministic policy are read again before presenting a new action.

Browser local storage is insufficient because it is unavailable when the browser is closed. Closed-browser monitoring therefore requires an explicit server-side subscription containing public data and preferences. This is a privacy and operations feature, not a small client toggle.

## Data and consent

Minimum persisted subscription:

- checksummed public wallet address and chain ID 143;
- target MON basis points, drift threshold and notification cooldown;
- one verified notification destination and consent timestamp;
- last evaluated block/time, last state, last notification reason and an idempotency key;
- paused/revoked timestamp and delivery-failure count.

Do not persist private keys, wallet signatures with transaction authority, token approvals, seed phrases, transaction nonces, or an executable trade. The setup screen must state that wallet holdings and strategy preferences become visible to the operator and notification provider. Consent must be opt-in, purpose-specific and revocable; deletion must remove the destination and strategy record.

## Read and evaluation pipeline

1. A scheduler leases due subscriptions in bounded batches.
2. Read a pinned Monad block, block timestamp, native MON balance, USDC balance, Kuru market parameters, packed L2 and BBO through at least one healthy RPC.
3. Apply the same strict token/deployment/precision/freshness checks as the browser adapter.
4. Run the versioned deterministic policy with integer arithmetic and record its input hash and result.
5. Notify only on a state transition into actionable drift, subject to cooldown and deduplication. A `BLOCK` caused by venue minimum may be useful as an optional one-time explanation, not repeated noise.
6. Include observation time and a link to reopen the app. Label every amount as an observation, not an executable quote.

No cached market value may be substituted after an RPC failure. No notification implies continuous service or guarantees that a later trade remains available.

## Scheduling, cost and delivery options

A five-minute interval is a reasonable prototype target, not a promise. Each observation requires block/market reads plus two balances; batch-capable RPC and subscription coalescing by block would control cost. Before launch, measure RPC request units, scheduler invocations, storage, delivery cost and rate limits at 100, 1,000 and 10,000 subscriptions.

Email is the simplest first delivery channel because it can be verified and revoked without wallet signing. Web Push is more private to operate but has browser/device permission and reliability constraints. SMS adds cost and more sensitive personal data. Only one channel should be validated initially.

## Recovery and operations

- Persist leases and idempotency keys so a crash cannot duplicate a notification.
- Exponential backoff applies to reads and delivery only; it must never trigger a transaction.
- After repeated RPC, market-shape or deployment-identity failures, pause evaluations globally, alert the operator and show service unavailable rather than stale advice.
- Dead-letter failed notifications with bounded retention and allow the user to inspect the last successful observation.
- Version policy inputs and evaluator code so an explanation can be reproduced.
- Provide per-user pause/delete plus an operator kill switch.
- Monitor observation lag, RPC disagreement, Kuru deployment changes, delivery failure rate and duplicate suppression.

## Acceptance gate before claiming the watcher exists

- Deployed scheduler, database and one delivery channel in a production-like environment.
- Explicit consent, pause, revoke and deletion flows tested end to end.
- At least seven days of measured scheduling/delivery reliability and documented costs.
- Fault injection for RPC outage, stale/empty book, proxy change, scheduler restart, duplicate job and delivery failure.
- Public status/last-observation UI that never labels stale data current.
- Security/privacy review and retention policy.

Until every item is met, MonMix must continue saying that it does not monitor the portfolio while closed.
