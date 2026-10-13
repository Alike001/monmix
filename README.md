# Monad Strategy Desk

Monad Strategy Desk is an owner-controlled spot portfolio strategy product for Monad. A user can inspect Kuru's live MON/USDC order book, connect an injected wallet, read real MON and USDC balances, choose a target allocation and advisory limits, receive a deterministic `WAIT`, `BLOCK`, or `REVIEW`, and simulate an exact protected native MON sell.

The user-confirmed native MON sell lifecycle is implemented but **disabled by default**. This work did not sign or broadcast a transaction. It has no token approval, backend signer, automation, private-key handling, or contract deployment. TypeScript policy limits bound a recommendation only; they are not independently enforced financial controls.

## Thirty-second journey

1. `/markets` verifies the deployed Kuru market, token metadata, precision, freshness and two-sided depth.
2. `/desk` connects an injected wallet on Monad chain 143 and reads native MON plus USDC balances.
3. The user sets a MON target, drift threshold, per-review cap, daily advisory budget and minimum review size.
4. Integer-only policy math returns `WAIT`, `BLOCK`, or `REVIEW`; adjustments under Kuru's declared 200 MON minimum are refused.
5. An eligible native MON sell can be revalidated and simulated exactly with bigint slippage protection, fill-or-kill, gas, balance, proxy and code-hash checks.
6. `/activity` persists wallet lifecycle records and reconciles actual receipts and Kuru `Trade` events. No simulation is presented as a trade.

## Run locally

Requirements: Node.js 22.16+ and pnpm 10.34.5+.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The public Monad RPC is the default. To use another read-only endpoint:

```bash
cp .env.example .env.local
```

## Verify

```bash
pnpm test
pnpm test:live
pnpm typecheck
pnpm lint
pnpm build
```

`pnpm test` is deterministic and does not require a network. `pnpm test:live` performs public `eth_call` and block reads only; it never asks for a key or sends a transaction.

## Verified deployment

- Network: Monad mainnet, chain ID `143`
- Public RPC default: `https://rpc.monad.xyz`
- Kuru MON/USDC order book: `0x065C9d28E428A0db40191a54d33d5b7c71a9C394`
- USDC: `0x754704Bc059F8C67012fEd69BC8A327a5aafb603`, 6 decimals
- MON: native asset represented by the zero address, 18 decimals
- Packed price precision: `1e8`; packed size precision: `1e10`
- `bestBidAsk()` return scale: `1e18`, cross-checked against packed depth

The application never embeds a previously observed price as live data. A mismatch between BBO and packed-depth normalization blocks the market read.

## Workspace

```text
apps/web/                 Next.js App Router product
packages/domain/          Original deterministic policy and unit math
packages/kuru-adapter/    Minimal ABIs, packed L2 decoder, review and direct-sell preflight
docs/                     Product, threat, integration, test and evidence documents
```

The original Phase 0 engine and its 11 tests were committed unchanged at `18a37432ffa3b3f985133414ae5af15a104e2f82` before the workspace migration. They now live in `packages/domain`; two unit-math tests extend the preserved suite.

## Provenance and licenses

This repository is MIT licensed. The product code and visual design are original to this project. Shijima informed control boundaries and Masayume informed market-focused UX composition; neither interface, branding, assets, typography, copy, or application source was copied. Kuru SDKs are not runtime dependencies. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [docs/PROVENANCE.md](docs/PROVENANCE.md).

OpenAI Codex was used for repository research, architecture, implementation, tests, documentation, and verification. AI output was reviewed against source code and live read-only Monad RPC evidence. Project maintainers remain responsible for the shipped code and claims.

## Current limits

- Mainnet execution is off unless an owner-reviewed build explicitly sets `NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=true`.
- The packed L2 interface reflects the verified deployed legacy market shape; the newer Kuru TS SDK uses a different ABI generation and is currently `UNLICENSED`.
- The direct sell has no onchain deadline; the app uses a short client preparation lifetime and mandatory re-simulation, which cannot eliminate wallet-confirmation latency.
- Strategy preferences and the daily budget are local advisory data, not contract-enforced restrictions.
- USDC-to-MON buying, approvals, automation and independently enforced caps remain unavailable.

See [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) for raw read evidence and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) for the Milestone 1 safety boundary.
