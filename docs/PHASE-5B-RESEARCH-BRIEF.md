# Phase 5B release research brief

## Objective and verified baseline

Rebrand the existing tested product as MonMix, publish its preserved Git history to the approved public GitHub destination, and leave the repository ready—but not authorized—for Vercel deployment. The inspected baseline was clean at `a9204f9ecfd8e50167654788fddf019c24d8b517` with protected two-way Kuru preparation and execution disabled by default.

## Repository facts

- Next.js App Router lives in `apps/web`; deterministic policy and Kuru integration remain isolated workspace packages.
- The release build is guarded by `scripts/assert-execution-disabled.mjs`; CI sets `NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false`.
- Phase 5B originally prepared a repository-root Vercel config. The linked project now uses Root Directory `apps/web`; the scoped deployment configuration and app-relative `.next` output supersede that earlier assumption.
- Browser persistence uses `strategy-desk:*` legacy keys. Renaming them would strand saved preferences and transaction recovery, so they are intentionally retained as internal compatibility identifiers.
- The approved GitHub CLI account resolved to `Alike001`; `Alike001/monmix` did not exist at the initial check.

## Branding and metadata findings

- The previous working name remained in the header, footer, metadata, README, security/license text and several user-facing messages.
- No favicon, application manifest or Open Graph image existed.
- Current Next.js 16 documentation supports `app/icon.svg`, a typed `manifest.ts`, metadata title templates, `metadataBase`, and generated Open Graph images. MonMix uses those framework-native paths without adding a dependency.

## Release boundary

Branding must not alter contract identities, ABIs, bigint conversions, venue minimums, FOK/minimum-output behavior, allowance handling, journaling, receipt reconciliation or feature flags. GitHub creation and push are authorized only after tests and secret/history scans pass. Vercel linking and deployment are not authorized.
