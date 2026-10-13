# Phase plan and Codex handoff

> Status update, 2026-10-13: Stages 0–1 and the transaction-ready portion of Stage 2 are complete. Native MON execution is disabled by default and has not been funded or broadcast. See `MILESTONES.md` and `EVIDENCE_LEDGER.md` for current evidence.

## Stage 0: Pinned reference review & product boundary (start now)
- Read SOURCE-IMPLEMENTATION-MAP.md, PRODUCT-SCOPE.md, README.md, policy.ts, tests.
- Clone *read-only references* into `/references` or a sibling directory on the user's machine, not into the new project's source tree:
  `git clone --filter=blob:none --depth=1 https://github.com/Blockchain-Oracle/shijima.git`
  `git clone --filter=blob:none --depth=1 https://github.com/Blockchain-Oracle/masayume.git`
  `git clone --filter=blob:none --depth=1 https://github.com/Kuru-Labs/ts-sdk.git`
- Record the exact commit SHA, license situation, chain addresses, and SDK published package/version. Never run untrusted install scripts from reference repositories just to inspect them.
- Inspect the exact code paths listed in SOURCE-IMPLEMENTATION-MAP.md; write a compatibility matrix. Do not copy their UI/source wholesale.
- Preserve the deterministic domain test suite, add numeric safety and idempotency tests.
**Exit:** source map and practical Kuru execution integration feasibility report, with explicit blockers.

## Stage 1: Real read-only product shell
- New Next.js app: public `/`, `/markets`, `/desk`, `/activity`, `/proof`.
- Use Kuru read-only feeds to populate a verified spot market, supported pair and live orderbook. Reject stale market data, wrong decimals and unsupported markets.
- Use real wallet balance reads and preview domain plans; make quote source and freshness visible.
- Build **original** responsive UX with markets and portfolio, inspired by UX patterns, no copied assets.
**Exit:** production build and real Monad/Kuru read-only data proven in screenshots and reproducible curl/RPC commands.

## Stage 2: Real, user-confirmed trade
- Precisely validate amount, price, slippage, wallet, chain ID, allowlist, balance, nonce, expiry and required approvals.
- Use supported Kuru SDK trading workflow with user confirming every financial action.
- Reconcile accepted tx hash to receipt and orders/fills, persist idempotency keys. No fake fills.
- Test wrong chain, stale quote, deadline expiry, insufficient gas/margin, partial fill, RPC timeout and user rejection.
**Exit:** confirmed Monad testnet transaction and verifiable per-order report with recoverable failure flows.

Implementation note: direct native MON sell preparation, wallet guarding, journaling and receipt reconciliation are complete. The remaining exit evidence is an explicitly owner-approved funded mainnet transaction; the deployed market is mainnet and no compatible testnet deployment was asserted. USDC buying remains deferred pending approval validation.

## Stage 3: Authorized automation (conditional, not automatic)
- Before signing unattended, prove cryptographically/onchain enforced policy: venue allowlist, max per-order and daily total, order direction, expiry, cancels, withdraw access, pause/revoke.
- Compare direct Kuru typed-trigger APIs vs custom worker: do not duplicate if protocol already handles safely.
- Use write-ahead journal, one sender per authority and event-based reconciliation; test crashes and restarted jobs.
- AI can explain observed decisions and maybe propose constrained timing, but model responses must not control keys, destinations, token permissions or caps.
**Exit:** a live bounded plan with demonstrable pause/revoke and no repeat execution.

## Stage 4: Judge and production-quality release
- Explain in 30 seconds who the product serves and what one working operation delivers.
- Public GitHub repository, original code, OSI license, attribution of Shijima inspiration and Masayume research, disclosures of AI tooling and any pre-existing code.
- Contract addresses and transactions, architecture, threat model, demo under 3 min, `/proof` real chain data and negative tests.
- Track 1 plus only sponsor bounties whose requirements are actually met (Kuru, Envio where applicable).

## Codex prompt to run in plan mode
You are the tech lead for a Monad Metropolis Track 1 spot portfolio strategy product. Use the provided original source starter and notes as the base. Enter PLAN MODE before writing new application code. Review the pinned upstream reference repos Shijima and Masayume, and Kuru's current TypeScript SDK. Treat Shijima's MIT license and Masayume's lack of a confirmed repository-wide license correctly. Do not make a clone or borrow branding. Our core flow: browse a real Monad Kuru spot market; define target base percentage and risk caps; compute deterministic allocations; user-confirm a trade; reconcile the onchain order and show a receipt. Unattended automation is a later, security-gated feature, not a slogan. Provide (1) a source-to-product map, (2) a list of verified Kuru contracts and SDK versions, (3) exact acceptance tests, (4) milestone sequence, and (5) the smallest working vertical slice that can be tested with no private keys in source. Work only on Phase 1 after the plan is reviewed. Do not sign, broadcast, spend assets, deploy contracts or create paid services without explicit owner approval. Clearly mark unavailable or simulated features. Keep the product 30-second understandable and satisfy Monad Metropolis originality/demo/source rules.
