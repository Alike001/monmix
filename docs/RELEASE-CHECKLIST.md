# Release-candidate checklist

## Repository and public-source readiness

- [x] MIT license and original-work provenance.
- [x] Third-party commit/license findings and no imported reference assets/code.
- [x] AI-use disclosure.
- [x] Reproducible pnpm lockfile and Node/pnpm versions.
- [x] CI workflow for tests, typecheck, lint, build and browser accessibility.
- [ ] Owner confirms the destination GitHub organization/repository.
- [ ] Configure branch protection and require the verification workflow.
- [ ] Confirm repository visibility is public before submission.
- [ ] Add final public URL, repository URL and demo-video URL to README/submission.

## Vercel readiness

- [x] Root `vercel.json` builds the pnpm workspace and publishes `apps/web/.next`.
- [x] No database, private key or paid service is required for the read-only release.
- [x] `MONAD_RPC_URL` may be configured server-side; no secret is exposed with `NEXT_PUBLIC_`.
- [x] `NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false` is the documented release value.
- [ ] Owner confirms Vercel project/team and GitHub integration.
- [ ] Configure production/preview environment variables with execution false.
- [ ] Deploy preview and run all six routes, API smoke checks, live read-only check and real-extension acceptance against the exact URL.
- [ ] Confirm HTTPS origin, security headers and external-link behavior.
- [ ] Promote to production only after owner review. No deployment was made during Phase 4B-1.

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
