# Release-candidate checklist

## Repository and public-source readiness

- [x] MIT license and original-work provenance.
- [x] Third-party commit/license findings and no imported reference assets/code.
- [x] AI-use disclosure.
- [x] Reproducible pnpm lockfile and Node/pnpm versions.
- [x] CI workflow for production audit, tests, typecheck, lint, guarded build and browser accessibility.
- [x] Public README badges, selected screenshots, security policy and judge quickstart.
- [x] Production dependency audit has no known advisories after the Next.js 16.3.8 security update.
- [x] Owner confirms the destination GitHub organization/repository: `Alike001/monmix`.
- [ ] Configure branch protection and require the verification workflow.
- [ ] Confirm repository visibility is public before submission.
- [ ] Add final public URL, repository URL and demo-video URL to README/submission.

## Vercel readiness

- [x] Vercel Root Directory is the repository root (`.`), preserving the workspace lockfile and local packages.
- [x] Root `vercel.json` uses frozen pnpm install, `pnpm build:release`, and publishes `apps/web/.next`.
- [x] Node `22.x` is selected by `package.json`; local/CI baseline is 22.16.0.
- [x] No database, private key or paid service is required for the read-only release.
- [x] `MONAD_RPC_URL` may be configured server-side; no secret is exposed with `NEXT_PUBLIC_`.
- [x] `NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false` is explicit in CI and `.env.example`; the public build refuses a true value.
- [x] Owner confirms Vercel project name: `monmix`.
- [ ] Owner confirms Vercel account/team and GitHub integration.
- [ ] Configure production/preview environment variables with execution false.
- [ ] Verify the Vercel dashboard shows `false` independently for Preview and Production before either build.
- [ ] Deploy preview and run all six routes, API smoke checks, live read-only check and real-extension acceptance against the exact URL.
- [ ] Confirm HTTPS origin, security headers and external-link behavior.
- [ ] Promote to production only after owner review. No deployment was made during Phase 5A.

## Product and submission

- [x] Thirty-second product promise and focused first journey.
- [x] Live Monad/Kuru integration and honest unavailable states.
- [x] Two-way preparation, exact allowance boundary and zero-allowance recovery.
- [x] Browser-only history limitation and no fabricated activity.
- [x] Onchain Finance & Trading and Kuru integration explanation.
- [ ] Owner-attended real-extension acceptance.
- [ ] One separately authorized receipt-backed mainnet transaction.
- [ ] Current official Metropolis and Kuru sponsor fields reviewed on submission day.
- [ ] ≤3-minute demo video recorded from the public release.
