# Smallest reliable read-only monitoring proposal

This is a separate post-release proposal. It is not implemented, hosted or described in the product as continuous monitoring.

## V1 user promise

“With your explicit consent, check this public Monad address every 15 minutes. Email me once when my MON allocation crosses the drift threshold, and remind me only after a 24-hour cooldown if it remains actionable. Never sign or submit a transaction.”

Fifteen minutes is a product starting point, not a reliability guarantee. The service reports its last successful observation and degrades to unavailable when delayed.

## Consent and data

The user supplies:

- public Monad address;
- target MON basis points and drift threshold;
- verified email destination;
- explicit consent timestamp and accepted privacy notice.

Persist only those values plus subscription status, policy version, last checked block/time, last result, last alert time, idempotency key and bounded delivery-error metadata. Encrypt the email destination at rest. Never store keys, signatures, approvals, executable calldata or wallet nonces. Provide pause, resume, delete and export controls.

## Minimal architecture

1. HTTPS subscription API validates address and integer policy inputs and completes email verification.
2. Postgres stores consented subscriptions and durable scheduler state.
3. A scheduled worker leases due subscriptions in batches.
4. For one pinned Monad block, it verifies the Kuru proxy/code hash, market parameters, token decimals, depth/BBO agreement and timestamp; then reads MON/USDC balances.
5. The existing deterministic domain package evaluates allocation drift.
6. An outbox transaction records a state-transition alert and idempotency key atomically.
7. A delivery worker sends email and records provider outcome.
8. The product shows last successful observation, current service health and unsubscribe/delete controls.

The first implementation should use one region, one database, one RPC provider plus the existing public fallback, and one email provider. Do not add web push or SMS until email delivery and deletion are proven.

## Failure and recovery

- Never substitute cached prices after a stale/empty/malformed book or code-hash mismatch.
- Retry reads and email delivery with bounded exponential backoff; retries can create notifications only through the same idempotent outbox record.
- Pause all evaluations on proxy/code-hash change and alert the operator.
- Suppress duplicate alerts until state returns inside the threshold and crosses again, or the 24-hour reminder policy becomes due.
- Record scheduler lag and mark the watcher degraded when the 15-minute target is missed by more than one interval.
- Dead-letter delivery after a bounded attempt count and expose failure to the user.
- Maintain an operator kill switch that stops reads/delivery but cannot affect wallets.

## Cost model to verify before implementation

For `N` active subscriptions at four checks/hour, the upper bound is `96N` evaluations/day. Coalesce shared market reads by block so each batch needs one deployment/market snapshot plus two balance calls per unique wallet. Measure:

- Monad RPC requests/compute units and rate limits;
- scheduled-worker runtime and concurrency;
- Postgres storage/IO for observations and outbox;
- email verification and alert deliveries;
- logging/metrics retention.

Load-test 100, 1,000 and 10,000 subscriptions and publish monthly estimates before selecting paid plans.

## Implementation slices

1. Local worker and schema with fake delivery; deterministic replay and consent deletion tests.
2. Staging database/scheduler with public test addresses; fault injection for RPC outage, stale book, proxy change, duplicate job and restart.
3. Verified email, unsubscribe/delete and service-health UI.
4. Seven-day staging reliability/cost observation.
5. Owner approval for a limited production beta. Monitoring remains read-only in every slice.

## Acceptance gate

Do not claim “monitoring while closed” until the deployed system demonstrates consent, deletion, scheduler recovery, idempotent alerts, stale-data refusal, proxy-change shutdown, delivery evidence, measured costs and seven days of observable operation.
