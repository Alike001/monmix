# GitHub and Vercel publishing runbook

GitHub publication is authorized for `Alike001/monmix`. Vercel project linking and deployment remain a separate owner gate; this document prepares those commands without running them.

## Release identity

- Repository root: the directory containing `pnpm-workspace.yaml` and `vercel.json`.
- Node: `22.x`; local and CI baseline `22.16.0`.
- Package manager: `pnpm@10.34.5` from `packageManager`.
- Install: `pnpm install --frozen-lockfile`.
- Build: `pnpm build:release`.
- Framework: Next.js.
- Output: `apps/web/.next`.
- Runtime: Vercel Node functions for `/api/*`; static output for product pages where Next.js permits it.
- Vercel Root Directory: repository root (`.`), not `apps/web`. This keeps the root lockfile and both workspace packages available.
- Vercel project name: `monmix`.

## Required environment configuration

Create these independently for **Preview** and **Production**:

```text
NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false
MONAD_RPC_URL=<owner-selected Monad mainnet HTTPS RPC>
NEXT_PUBLIC_SITE_URL=<final HTTPS production origin>
```

`MONAD_RPC_URL` is server-only. It need not be secret if it is a public endpoint, but a credentialed endpoint must never use a `NEXT_PUBLIC_` name. Leave `NEXT_PUBLIC_MONAD_RPC_URL` unset unless the endpoint is intentionally public.

Next.js inlines `NEXT_PUBLIC_*` values during the build. Changing the Vercel value afterward does not change an existing deployment; rebuild it. The release build also fails if the execution variable is `true` or malformed.

## Pre-publish local checks

```bash
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install --frozen-lockfile
NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false pnpm verify
pnpm test:live
git status --short
git log --oneline -5
```

Expected: every command passes, the final status is empty, and the live command performs reads/simulations only.

## Connect the approved GitHub repository

The approved destination is `https://github.com/Alike001/monmix`. With `gh auth status` showing the active `Alike001` account, create the empty public repository without initializing files, then preserve and push the local history:

```bash
gh repo create Alike001/monmix --public --description "MonMix — user-controlled MON/USDC portfolio strategy and protected Kuru trade preparation on Monad."
git remote add origin https://github.com/Alike001/monmix.git
git remote -v
git ls-remote origin
git push -u origin main
```

If `origin` already exists, inspect it before changing anything. Never force-push or overwrite unexpected remote history:

```bash
git remote get-url origin
git remote set-url origin https://github.com/Alike001/monmix.git
```

Then make the repository public, enable private vulnerability reporting, protect `main`, require pull requests and require the `verify` workflow. Replace the static release badges or add a CI badge only after the final repository path is known:

```text
https://github.com/Alike001/monmix/actions/workflows/verify.yml/badge.svg
```

## Link Vercel without deploying

After the owner confirms the Vercel account/team destination:

```bash
pnpm dlx vercel@latest login
pnpm dlx vercel@latest link --project monmix
```

During linking, choose the repository root and confirm the detected settings against the release identity above. `.vercel/` is ignored and must not be committed.

Set the safety gate independently:

```bash
printf '%s' 'false' | pnpm dlx vercel@latest env add NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION preview
printf '%s' 'false' | pnpm dlx vercel@latest env add NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION production
```

Add `MONAD_RPC_URL` through the Vercel dashboard or interactive CLI without placing a credential in shell history. Verify environment targets in the dashboard.
Set `NEXT_PUBLIC_SITE_URL` to the final production HTTPS origin so canonical and social metadata resolve to the public deployment. It is not a secret.

To validate Vercel's build locally without publishing:

```bash
pnpm dlx vercel@latest pull --environment=preview
pnpm dlx vercel@latest build
```

## Deployment commands requiring separate approval

Only after the owner approves the linked destination and environment review:

```bash
pnpm dlx vercel@latest deploy
pnpm dlx vercel@latest deploy --prod
```

The first creates a preview; the second promotes a new production deployment. Neither command is authorized by this document. After each approved deployment, record its URL and immutable commit, run route/API smoke checks, inspect the bundled disabled controls, and complete the owner-attended checklist in `docs/REAL-WALLET-ACCEPTANCE.md`.
