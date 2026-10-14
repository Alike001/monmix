# MonMix

[![License: MIT](https://img.shields.io/badge/license-MIT-10120f.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.8-10120f.svg)](apps/web/package.json)
[![Mainnet execution](https://img.shields.io/badge/mainnet%20execution-disabled-d35245.svg)](docs/THREAT_MODEL.md)
[![Verify](https://github.com/Alike001/monmix/actions/workflows/verify.yml/badge.svg)](https://github.com/Alike001/monmix/actions/workflows/verify.yml)

**Your crypto, your mix.**

[Live app](https://monmix.vercel.app) · [GitHub](https://github.com/Alike001/monmix) · [Technical demo](https://youtu.be/0MpnUyNHnPI) · [Pitch](https://youtu.be/46F1SSIIauw) · [Product advertisement](https://youtu.be/DrRXAqUAj6E)

**Monad Metropolis** · Onchain Finance & Trading · Kuru — Build the Next Consumer Trading App on Kuru · **Ready for judging**

MonMix helps people keep their MON and USDC holdings aligned with their goals. Choose a target allocation, see when the portfolio drifts, and review a protected Kuru trade to rebalance—all while keeping control of the wallet.

![MonMix landing page](docs/screenshots/home-desktop.png)

## The problem

Spot traders know what mix of volatile and stable assets they want, but maintaining that mix means repeatedly checking balances, valuing the portfolio, calculating drift, understanding venue constraints, and constructing a safe order. A conventional swap ticket starts with an amount; it does not explain whether that trade fits a portfolio goal.

## The solution

MonMix starts with the portfolio decision and carries it through to a verifiable Kuru preparation:

1. Connect MetaMask or another explicitly selected injected wallet.
2. Verify that the selected provider, account, and network all agree on Monad Mainnet, chain ID `143`.
3. Read real MON and USDC balances and value them using Kuru's live MON/USDC order book.
4. Choose a preset or custom target allocation and advisory review limits.
5. Receive a deterministic `WAIT`, `BLOCK`, or `REVIEW` decision with an ordinary-language explanation.
6. For an eligible adjustment, inspect the proposed amount, venue minimum, expected output, price impact, slippage floor, gas ceiling, contract identity, and failure conditions.
7. Run the exact protected Kuru simulation. Activity handling distinguishes prepared, rejected, broadcast, confirmed, reverted, unresolved, and reload-reconciled states without presenting a simulation as a trade.

The differentiation is the recurring target-and-drift workflow: Kuru is the execution venue, while MonMix turns portfolio intent into a bounded, explainable action rather than acting as a generic swap form.

## What is live

- Public application at [monmix.vercel.app](https://monmix.vercel.app).
- Monad Mainnet wallet connection with explicit multi-provider selection, account verification, network switching, disconnect, and account-change invalidation.
- Real native MON and USDC balance reads.
- Live Kuru MON/USDC spread and packed order-book depth with freshness and precision checks.
- Portfolio presets, custom allocation targets, visual drift, and browser-local preferences.
- Integer-only policy evaluation producing `WAIT`, `BLOCK`, or `REVIEW`.
- Protected native MON sell and USDC-to-MON buy preparation, including FOK, `minAmountOut`, gas, balances, market limits, proxy implementation, and bytecode-hash verification.
- Exact-amount USDC allowance preparation and separately confirmed residual-allowance recovery design.
- Browser transaction journal, duplicate-action prevention, receipt reconciliation, direction-aware Kuru `Trade` decoding, and post-receipt allocation evidence.
- Responsive desktop/mobile routes, automated accessibility coverage, honest empty states, activity, proof, and product documentation.

Public mainnet execution is **disabled**. No completed onchain trade or verified fill receipt exists. A protected simulation is read-only and does not prove execution or guarantee its estimated output.

## Monad and Kuru integration

- Network: Monad Mainnet, chain ID `143`
- Public RPC default: `https://rpc.monad.xyz`
- Kuru MON/USDC order book: `0x065C9d28E428A0db40191a54d33d5b7c71a9C394`
- Verified implementation: `0x5e3446c600524Be453bbCEFD46a9E4C9bE8899a0`
- USDC: `0x754704Bc059F8C67012fEd69BC8A327a5aafb603`, 6 decimals
- MON: native asset, 18 decimals
- Packed price precision: `1e8`; packed size precision: `1e10`
- `bestBidAsk()` scale: `1e18`, independently cross-checked against packed depth
- Declared venue minimum: `200 MON`

MonMix uses a minimal independently declared ABI matching the verified deployed market. It does not depend on the unlicensed Kuru SDK. Market reads fail closed on stale or empty depth, unexpected token metadata, precision mismatches, proxy upgrades, implementation bytecode changes, or factor-of-ten BBO normalization errors.

Owner-attended acceptance used a funded MetaMask wallet holding approximately 219 MON and reached protected sell simulations on Monad Mainnet, including an exact 200 MON preparation. Those quotes were temporary observations and are never reused as live data. No wallet confirmation, transaction broadcast, or fill was completed.

## Evidence and verification

The verified release gate currently covers:

- 73 deterministic, adapter, wallet, journal, financial-boundary, and release-configuration tests;
- 44 Playwright browser and automated WCAG A/AA checks across desktop, tablet, 390px, and 375px layouts;
- TypeScript, ESLint, production dependency audit, and guarded Next.js release build;
- live read-only Monad/Kuru checks for chain identity, proxy implementation and code hash, token metadata, market precision, BBO/depth agreement, 200 MON minimum, protected sell simulation, buy preparation, allowance, and gas estimation;
- GitHub Actions on Node 22 and pnpm 10.34.5.

Run the complete local gate:

```bash
pnpm install --frozen-lockfile
NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false pnpm verify
pnpm test:live
```

`pnpm test:live` performs public `eth_call` and block reads only. It never asks for a key or sends a transaction. The guarded release build refuses execution through either the process environment or any Next.js production environment file.

## Architecture

```text
apps/web/                 Next.js App Router product and wallet UX
packages/domain/          Deterministic allocation policy and bigint unit math
packages/kuru-adapter/    Minimal ABI, market decoder, verification and preflights
docs/                     Threat model, evidence, runbooks and product documentation
```

The browser owns presentation, injected-wallet consent, local preferences, and the durable local journal. The domain package is authoritative for recommendations. The Kuru adapter independently verifies chain and contract state, normalizes units with bigint math, and simulates protected calls. There is no backend signer, custody service, autonomous agent, private-key handling, or custom deployed contract.

## Run locally in read-only mode

Requirements: Node.js 22.x (the repository pins 22.16.0) and pnpm 10.34.5.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. The default public Monad RPC is sufficient for read-only use. An alternate endpoint can be configured from `.env.example`; never place wallet keys or seed phrases in an environment file.

## Important limitations

- Public Production and Preview builds keep mainnet execution disabled.
- Portfolio targets, drift thresholds, caps, and daily budgets are browser-local advisory preferences. They are not independently enforced onchain and do not run while the browser is closed.
- A funded wallet with a legitimate eligible strategy decision is required to reach the complete Kuru preflight. Adjustments below the declared 200 MON floor are blocked.
- Simulations are not transactions, receipts, fills, performance evidence, or guaranteed output.
- No completed onchain trade, verified fill receipt, customer activity, retention, trading volume, or prize result is claimed.
- Kuru's direct buy and sell calls have no onchain deadline. The browser expires reviews and revalidates before a future wallet request, but a delayed request already open in a wallet must be rejected and prepared again.
- A future USDC buy would require a separate exact-amount approval and then a fresh trade confirmation. Unlimited approvals are not requested.
- Browser-local activity is not permanent global account history.
- Continuous closed-browser monitoring and autonomous execution are not implemented.

See [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) for live-read evidence, [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) for security boundaries, [docs/JUDGE-QUICKSTART.md](docs/JUDGE-QUICKSTART.md) for the judge path, and [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md) for desktop/mobile captures.

## Provenance, license, and AI disclosure

MonMix is MIT licensed. The product code and visual design are original to this project. Shijima informed portfolio-control and execution-recovery boundaries; Masayume informed market-focused product composition. Their interfaces, branding, assets, typography, copy, and application source were not copied. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [docs/PROVENANCE.md](docs/PROVENANCE.md) for pinned references, licenses, and attribution.

OpenAI Codex was used for repository research, architecture, implementation, tests, documentation, and verification. AI output was reviewed against source code, deterministic tests, and live read-only Monad RPC evidence. Project maintainers remain responsible for the shipped code and claims.
