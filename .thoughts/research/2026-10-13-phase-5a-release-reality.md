# Reality Research: Phase 5A public-release baseline

## Scope

Audit the repository at `5eacb2afb802a9d8fa97a59bc33458fef66020bc` for public GitHub, Vercel and owner-attended real-wallet readiness without publishing, deploying or enabling financial execution.

## Sources Checked

- Git history, status, manifests, lockfile, CI, Vercel configuration and environment example.
- Application routes, runtime environment access, wallet write call sites, tests and release documentation.
- MIT license, third-party notices, provenance and AI disclosure.
- Context7 copies of current Vercel deployment and Next.js 16 environment/runtime documentation.
- Current npm registry metadata and `pnpm audit --prod`.
- `pnpm licenses list --prod`.

## Verified Facts

- The starting tree was clean and exactly matched the requested commit.
- The repository has an MIT license, explicit upstream commit/license findings, original-work provenance and an AI-tool disclosure.
- No Shijima, Masayume or Kuru SDK source or assets are runtime imports.
- Runtime data comes from Monad RPC, the injected wallet and browser-local journal/preferences. Mock providers and values occur only in test files.
- Wallet writes exist only behind the compile-time client flag and explicit wallet actions. There is no private-key account, backend signer, signing service or transaction endpoint.
- Next.js public environment variables are build-time constants. A public release must be rebuilt with the execution flag disabled.
- Vercel supports repository-root install/build/output overrides and Node 22.x. The workspace must use the repository root so its lockfile and local packages remain available.
- The initial production audit found current advisories in Next.js 16.2.9 and transitive PostCSS/sharp. Next.js 16.3.8 is the registry-advised patched line and retains compatibility with Node >=20.9 and React 19.
- After the focused Next.js/tooling upgrade, `pnpm audit --prod` reports zero known production advisories.
- No Git remote or Vercel project is configured. No public destination has been approved.

## Inferences

- A guarded Vercel build command is necessary because a dashboard mistake on a `NEXT_PUBLIC_*` flag would otherwise permanently compile execution-enabled controls into that deployment.
- Real-wallet acceptance can verify provider, chain, balances and simulations without signatures. Exact account-bound buy simulation additionally requires a pre-existing sufficient USDC allowance; creating one is outside Phase 5A.

## Unknowns And Questions

- Owner-selected GitHub repository, visibility transition and branch-protection administrators.
- Owner-selected Vercel team/project, RPC endpoint and final Preview/Production environment values.
- Actual MetaMask-compatible behavior on the final HTTPS origin.
- Whether an owner-controlled acceptance account already has balances and allowance suitable for both exact directions.

## Not Included

- GitHub creation or push, Vercel linking or deployment, wallet unlocking, approval, signature, transaction, transfer, custom contract or hosted watcher.
