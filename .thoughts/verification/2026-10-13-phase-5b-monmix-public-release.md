# Verification Audit: Phase 5B MonMix public release

## Verdict

**Pass for GitHub publication and Vercel preparation; Vercel deployment remains deliberately pending.** MonMix is publicly available with preserved history, accurate financial-product claims, execution disabled by default, a reproducible release configuration, and a successful Node 22 GitHub Actions workflow. No Vercel project was linked or deployed, no wallet was operated, and no signature, approval, transfer or transaction was requested.

## Traceability

| Requirement | Evidence | Result |
| --- | --- | --- |
| Inspect and preserve baseline | Clean start at `a9204f9ecfd8e50167654788fddf019c24d8b517`; financial package diff remained empty | Pass |
| Rebrand public product | MonMix navigation, copy, route metadata, README, docs, license and security policy | Pass |
| Original identity assets | Independent split-allocation `M`, `icon.svg`, manifest and generated social card | Pass |
| Accurate public claims | Execution-disabled, browser-local and simulation boundaries retained throughout app/docs | Pass |
| Preserve financial behavior | No changed files in `packages/domain`, `packages/kuru-adapter`, execution components, journal or release guard | Pass |
| Safe GitHub publication | Authenticated account exactly `Alike001`; empty public repository created without initialization; normal push | Pass |
| Secret and reference exclusion | Tracked-file, worktree and Git-history pattern scans; no reference repository paths tracked | Pass |
| Public repository verification | Public README, LICENSE and notices returned HTTP 200; local and remote `main` matched | Pass |
| Public CI | GitHub Actions run `38438213353`, Node 22.16.0 | Pass |
| Vercel preparation only | Root workspace config, guarded build, project name/environment runbook; no link/deploy | Pass |

## Quality gates

- Production dependency audit: zero known vulnerabilities.
- Deterministic/release tests: 64 passed (domain 13, Kuru adapter 20, web 25, release 6).
- Typecheck: passed.
- ESLint: passed with zero warnings.
- Guarded production build: passed with `NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false`; static icon, manifest and Open Graph routes generated.
- Playwright/responsive/axe: 39 passed across desktop, 768px, 390px and 375px.
- Live read-only integration: passed at Monad block `113098320` and preparation block `113098339`.
- Screenshots: all six routes captured at desktop and mobile under `docs/screenshots/`.

## Defects found and resolved

1. The generated Open Graph image initially violated Next.js image-layout requirements. Multi-child nodes now explicitly declare flex layout.
2. Rapid first interaction could race the delayed browser-preference load. Strategy controls now remain disabled until local preferences hydrate, preserving existing storage keys and preventing the initial selection from being overwritten.
3. The first public CI run exposed insufficient live-market metric-label contrast under the GitHub Chrome environment. The label color was strengthened while retaining a separate accessible dark-card color; the replacement public run passed all axe checks.
4. The route resource test could treat deliberate navigation cancellation as a missing chunk. It now waits for network idle per route and still fails on genuine document/script/style/image/font errors.

## Live read-only evidence

- Chain: Monad mainnet `143`.
- Kuru market proxy: `0x065C9d28E428A0db40191a54d33d5b7c71a9C394`.
- Implementation: `0x5e3446c600524Be453bbCEFD46a9E4C9bE8899a0`.
- Runtime code hash: `0x6576ced90ca537c9aa058ea4a54ab5edd802ab78b834168b21fcc6d9ac392c0c`.
- Declared minimum: `200 MON`; observed book status `LIVE`, age `0s`.
- Protected read-only sell preparation: exactly 200 MON, FOK, expected `4.863400 USDC`, protected minimum `4.839083 USDC`.
- Read-only buy preparation: `9.741601 USDC`, exact approval required, allowance `0`, expected about `400.000041061 MON`; no approval or buy was submitted.

## Remaining gates

- Configure Vercel Preview and Production with `NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false`, an owner-selected `MONAD_RPC_URL`, and the final `NEXT_PUBLIC_SITE_URL`; rebuild after setting public variables.
- Owner confirms Vercel account/team before project linking or deployment.
- Complete hosted HTTPS, owner-attended MetaMask-compatible acceptance. Mock-provider coverage is not real-extension evidence.
- Configure GitHub branch protection/rules and private vulnerability reporting as an owner repository-administration action.
- A receipt-backed mainnet trade remains a later, exact, separately approved financial action; this release contains no such evidence.
