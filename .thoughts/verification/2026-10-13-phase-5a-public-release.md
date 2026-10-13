# Verification Audit: Phase 5A public-release preparation

## Verdict

**Conditional pass.** The repository is ready to connect to an owner-approved public GitHub repository and Vercel Preview with mainnet execution disabled. Source, configuration, dependency, route, responsive, accessibility, build and read-only chain gates pass. GitHub CI, the Vercel environment dashboard, the hosted HTTPS origin and a real injected wallet cannot be accepted until those destinations exist and the owner attends the session.

## Artifacts Checked

- Git history from `5eacb2afb802a9d8fa97a59bc33458fef66020bc` through the Phase 5A commits.
- `LICENSE`, `THIRD_PARTY_NOTICES.md`, `docs/PROVENANCE.md`, `SECURITY.md` and README disclosure.
- Root/app manifests, lockfile, Node/pnpm pins, `.env.example`, Vercel configuration and GitHub workflow.
- Runtime application, adapter, wallet/write call sites, APIs and browser tests.
- Current Vercel and Next.js 16 deployment/environment documentation through Context7.
- Current npm registry package metadata, production vulnerability audit and production license inventory.
- All six routes and the six server APIs produced by the production build.

## Requirement Traceability

| Requirement | Evidence | Result |
| --- | --- | --- |
| Audit history, licenses, attribution and AI use | Git history; MIT license; notices/provenance | Pass |
| Reproducible Vercel workspace | Root Directory `.`, frozen pnpm install, guarded root build, nested `.next` output, Node/pnpm pins | Pass in configuration |
| Execution false in public builds | CI and env example set false; release build rejects true/malformed values | Pass |
| No fabricated/runtime custody systems | Runtime source scan; live adapters; no key account, wallet client, signer service or transaction API | Pass |
| Public GitHub preparation | README badges/screenshots, security policy, CI, quickstart and publishing runbook | Pass; destination pending |
| Real-wallet acceptance readiness | Hosted checklist covers detection, switching, balances, strategy, both directions, refusals, expiry and no signatures | Pass as plan; manual run pending |
| Route/mobile review | Same-origin document/resource checks, all routes, four widths, bottom-nav reachability and axe | Pass |
| CI/local equivalence | CI uses frozen install, audit, same tests/type/lint/release build/e2e commands | Pass in source; hosted CI pending |
| No publish/deploy | No remote configured; no Vercel link or deployment metadata | Pass |

## Acceptance Criteria Coverage

- Next.js was updated from vulnerable 16.2.9 to patched 16.3.8 with matching ESLint configuration and Node 22 type declarations.
- `pnpm audit --prod` reports zero known advisories.
- Production license inventory contains known permissive/content licenses plus the LGPL libvips binary distributed through Next.js/sharp; notices identify the audit command and scope.
- `NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=true pnpm build:release` fails before `next build`.
- `NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false pnpm build:release` succeeds and emits six product routes plus six dynamic APIs.
- Every public route returns 200; no same-origin document/script/style/image/font request fails and no browser page error occurs.
- No runtime mock/fixture market or balance source was found. Mocked providers and deterministic values remain confined to tests.
- Real-extension evidence remains pending and is not conflated with the mocked EIP-1193 browser test.

## Quality Gates

| Gate | Result |
| --- | --- |
| Frozen install | Pass; lockfile unchanged by install |
| Production dependency audit | Pass; zero advisories |
| Deterministic/release tests | 63 passed: domain 13, adapter 20, web 25, release 5 |
| Typecheck | Pass |
| Lint | Pass with zero warnings |
| Guarded production build | Pass with execution explicitly false, Next.js 16.3.8 |
| Playwright/axe/responsive | 38 passed at desktop, 768, 390 and 375 widths |
| Live read-only integration | Pass at block `113091473` |

The local runner provides Node 24.14.1, so pnpm emitted the expected engine warning against the release pin. GitHub CI is configured for Node 22.16.0 and Vercel is constrained to Node 22.x, but those hosted executions remain pending until publication.

## Deviations From Plan

- No real extension was opened because the owner was not attending on a final HTTPS deployment.
- No remote, GitHub repository, Vercel project or environment was created.
- Exact account-bound buy simulation was not claimed for the owner. It requires a selected account with an existing sufficient allowance; Phase 5A must not create one.
- Only two representative screenshots are tracked in the public docs to keep the repository compact; the full local screenshot set remains under ignored `artifacts/`.

## Gaps And Risks

- Preview and Production dashboard values cannot be inspected before a Vercel project exists. Both must explicitly show execution false and trigger new builds.
- GitHub branch protection and the first Node 22 CI run are unverified until push.
- The final HTTPS origin may expose extension/CSP/origin behavior not reproducible with the mocked provider.
- RPC availability remains external. A credentialed server RPC must not be exposed through a `NEXT_PUBLIC_` variable.
- Kuru orders still have no onchain deadline; this release does not enable those calls.

## Follow-ups

1. Owner supplies exact GitHub `OWNER/REPOSITORY` and Vercel team/project.
2. Run the documented remote/link commands and inspect, rather than assume, their destinations.
3. Configure Preview and Production execution flags to false and server-only RPC values.
4. Require the GitHub `verify` check on protected `main`.
5. Deploy Preview only after approval, rerun smoke/live checks, and complete the owner-attended wallet checklist without signatures.
6. Review evidence before approving Production. A funded trade remains a separate later authorization.

## Evidence Log

- Live chain: Monad `143`.
- Market proxy: `0x065C9d28E428A0db40191a54d33d5b7c71a9C394`.
- Implementation/hash: `0x5e3446c600524Be453bbCEFD46a9E4C9bE8899a0` / `0x6576ced90ca537c9aa058ea4a54ab5edd802ab78b834168b21fcc6d9ac392c0c`.
- Live floor: `200 MON`; price/size precision `1e8 / 1e10`.
- Observed protected sell: 200 MON, expected `4.865800 USDC`, minimum `4.841471 USDC`, gas ceiling `0.028549392 MON`.
- Observed buy probe: `9.745601 USDC`, expected `400.0657224958 MON`, protected `398.065393883321 MON`, allowance zero; exact approval simulation only.
- No private key, signature, approval, transaction, transfer, push, Vercel link or deployment occurred.
