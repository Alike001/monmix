# Security policy

Monad Strategy Desk is pre-release financial software. Mainnet execution is disabled in public release builds, browser strategy limits are advisory, and no maintainer will ask for a private key or seed phrase.

## Reporting a vulnerability

After the public GitHub repository is created, use its private **Security → Report a vulnerability** workflow. Do not include exploitable wallet, RPC, or transaction details in a public issue. Until that channel exists, do not send secrets or wallet credentials to a maintainer; record the affected commit and a minimal non-sensitive reproduction for owner review.

Reports should include the exact commit, affected route or module, expected and observed behavior, and whether the issue can change calldata, value, allowance, account, chain, receipt interpretation, or execution-gate behavior.

## Supported release

Only the latest commit on the protected `main` branch is intended for review. Before publishing a release, CI must pass the production dependency audit, deterministic tests, typecheck, lint, guarded production build, Playwright responsive checks, and automated accessibility checks.

## Safe research boundary

- Never test with funds or broadcast a transaction without the owner's separate authorization.
- Never request, copy, store, or transmit a seed phrase or private key.
- Do not test third-party Kuru or Monad infrastructure destructively.
- A simulation, wallet popup, transaction hash, or matching event alone is not proof of a protected financial outcome; follow the receipt and balance-evidence rules in `docs/THREAT_MODEL.md`.
