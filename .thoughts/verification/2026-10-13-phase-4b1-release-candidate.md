# Verification Audit: Phase 4B-1 release candidate

## Verdict

**Conditional pass.** The execution-disabled application satisfies the code, read-only chain, responsive, accessibility, documentation and release-preparation requirements. It is suitable for an owner-reviewed public preview with execution false. A real MetaMask-compatible extension session, public deployment smoke test and funded receipt are intentionally outstanding and block any claim of real-wallet or mainnet-transaction acceptance.

## Artifacts Checked

- Starting commit `ef353a94a66a80cc54181b622da732699fd677f9` and Phase 4A history.
- Phase 4B implementation commits `be89249` and `69852d3`.
- Domain, adapter, wallet, preflight, journal, receipt and activity implementation.
- Minimal Kuru ABI, pinned deployment identity and read-only live check.
- README, threat model, integration evidence, test plan, owner runbook, wallet plan, release checklist and monitoring proposal.
- Desktop and mobile captures for `/`, `/markets`, `/desk`, `/activity`, `/proof` and `/docs` under `artifacts/screenshots/phase-4b1/`.

## Requirement Traceability

| Requirement | Evidence | Result |
| --- | --- | --- |
| Preserve Phase 4A two-way strategy and default-off gate | Existing policy/preflight suites; compile-time checks in both preflights | Pass |
| Audit sell value/calldata and buy units/allowance | Adapter source, minimal ABI, live sell/buy preflights, integration document | Pass read-only |
| Freshness, code hash, FOK and output protection | Deployment verification, exact simulations, monotonic revalidation tests | Pass |
| No onchain-deadline overclaim | UI, README, threat model and runbook explicitly distinguish browser expiry | Pass |
| Residual allowance handling | Live allowance API, exact zero-approval preparation, separate journal action/event proof | Pass read-only |
| Duplicate prevention and recovery | Account/market serialization, durable hash states and reload reconciliation tests | Pass |
| Receipt-backed outcome truthfulness | Full sell-size/output proof and buy direction/output proof; ambiguity is unresolved | Pass in code; funded receipt pending |
| MetaMask-compatible acceptance | Mocked EIP-1193 browser coverage plus owner-attended plan | Manual evidence pending |
| Public release preparation | CI, Vercel config, safe env example, security headers and quickstart | Prepared; destination/deployment pending |
| Mainnet runbook only | Exact 200 MON sell runbook with calculation, confirmation, outcomes and shutdown | Pass; not executed |
| Read-only watcher feasibility | Consent, data, scheduling, cost, alerts, recovery and staged acceptance proposal | Pass as design only |

## Acceptance Criteria Coverage

- Exact native sell: live protected 200 MON `eth_call` and gas estimation passed; no send call.
- Exact USDC buy: dynamic above-floor quote and exact approval simulation passed; live allowance was zero, so the account-bound funded buy correctly remained pending.
- Market identity: chain 143, proxy `0x065C...C394`, implementation `0x5e34...99a0`, runtime hash `0x6576...0c0c`, USDC identity/decimals and 200 MON floor matched pins.
- Review expiry: ticking UI and exact boundary tests; execution control disables at expiry.
- Revalidation: sell, approval, buy and revocation tests reject changed identity, weakened output, increased gas or changed allowance.
- Mobile reachability: all routes at 375, 390, 768 and 1440 pixels have no horizontal overflow or automated WCAG A/AA findings; final content and the Activity action can scroll above fixed navigation.
- Real wallet: not performed. Browser test explicitly says mocked and cannot satisfy extension acceptance.

## Quality Gates

| Gate | Result |
| --- | --- |
| `pnpm test` | 58 passed: domain 13, Kuru adapter 20, web 25 |
| `pnpm typecheck` | Pass |
| `pnpm lint` | Pass, zero warnings |
| `pnpm build` | Pass, Next.js 16.2.9 production build; 6 static product routes and 6 dynamic APIs |
| `pnpm test:e2e` | 36 passed, including axe, responsive widths and mocked injected-wallet buy preparation |
| `pnpm test:live` | Pass at block `113085405`; live book, deployment, sell/buy simulations and allowance read |
| Runtime smoke | HTTP 200 for all six product routes and `/api/market` |
| Security headers | `nosniff`, frame deny, strict-origin referrer policy and restricted camera/microphone/geolocation present |

## Deviations From Plan

- No real extension was operated because the owner was not present. No attempt was made to unlock or automate a wallet.
- No GitHub remote, Vercel project or public URL was configured because the owner has not supplied destinations.
- Screenshots show the truthful disconnected/empty release state. Connected write controls remain disabled.
- The watcher remains a proposal; no hosted persistence, scheduler or notification provider was created.

## Gaps And Risks

- Kuru direct orders have no onchain deadline. FOK and minimum output remain effective, but a wallet request left open can outlive the browser review; it must be rejected and prepared again.
- The first funded buy still needs a real exact approval before its account-bound buy simulation and final receipt can be proven.
- Browser history is local and can be removed or tampered with; chain receipts remain authoritative.
- Strategy caps are advisory and not enforced by a contract or delegated-permission system.
- RPC and injected-wallet software remain trusted dependencies.

## Follow-ups

1. Owner chooses the GitHub repository and Vercel project; deploy with execution false.
2. Perform and record the owner-attended real-extension acceptance plan on the final HTTPS origin.
3. Re-run all gates and live reads on the deployed commit.
4. Only after a separate exact authorization, follow the 200 MON sell runbook for one receipt-backed mainnet proof.

## Evidence Log

- Live block: `113085405`; observed bid/ask: `0.024342 / 0.024379 USDC` in x18-normalized form.
- Live protected sell: expected `4.868400 USDC`, protected minimum `4.844058 USDC`, gas ceiling `0.028540518 MON` at the observed gas price. These are session observations, not application constants.
- Dynamic buy probe: `9.751601 USDC` quoted `400.0000410189 MON`, protected minimum `398.0000408138055 MON`; exact approval required, allowance `0`.
- No approval, revocation, signature, broadcast, transfer or deployment occurred.
