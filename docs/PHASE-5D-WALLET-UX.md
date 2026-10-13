# Phase 5D wallet UX and AppKit decision

Checked on 2026-10-13 against MonMix's pinned stack: Next.js 16.3.8, React 19, wagmi 3.7.7, viem 2.57.5 and pnpm 10.34.5.

## Decision

Reown AppKit was **not adopted**. The current stable packages in the npm registry are `@reown/appkit@1.8.24` and `@reown/appkit-adapter-wagmi@1.8.24`. The adapter's broad peer range can resolve beside wagmi 3, but Reown's stable Next.js App Router guide still installs `wagmi@2.x`. Reown publishes wagmi 3 support only through a `2.0.0-wagmi-3.0` prerelease/canary line. That is not a stable production migration target for a financial application.

The official App Router setup also requires a Reown Project ID and cookie-backed server state, while warning that AppKit does not fully support wagmi's `ssr` flag. AppKit includes WalletConnect, Coinbase and injected connectors and exposes optional swaps, onramp and account/social features. Those features can be disabled, but they add onboarding surface and dependency weight that MonMix does not need for this release. The stable package archives alone are approximately 1.0 MB for AppKit and 0.87 MB for the wagmi adapter before their transitive dependencies and production bundling.

Because the compatibility condition was not met, no AppKit dependency was installed and no production wallet infrastructure was migrated. An isolated AppKit branch was not created: the requested prototype was conditional on full compatibility, and a canary-only wagmi 3 path fails that condition.

Sources:

- [Reown AppKit Next.js installation](https://docs.reown.com/appkit/next/core/installation)
- [Reown AppKit options and features](https://docs.reown.com/appkit/react/core/options)
- [Monad network information](https://docs.monad.xyz/developer-essentials/network-information)
- npm registry metadata for `@reown/appkit` and `@reown/appkit-adapter-wagmi`, retrieved 2026-10-13

## Implemented wallet experience

MonMix retains wagmi's EIP-6963 injected-provider discovery and its direct EIP-1193 verification boundary. One header entry now owns the complete wallet experience:

- disconnected users open an accessible provider chooser and explicitly select a named extension;
- connected users see the selected wallet, account, provider-reported network and chain ID;
- Ethereum mainnet (1), Arbitrum One (42161), Monad Testnet (10143), unknown networks and provider/account mismatches cannot become `READY`;
- only a provider-reported Monad Mainnet (143) that agrees with wagmi's account and chain becomes `READY`;
- wrong-network users get one explicit `Switch to Monad Mainnet` action;
- rejection or provider/account changes retain a fail-closed state and invalidate account-bound preparations;
- the portfolio panel contains balances and strategy decisions, not a second wallet control;
- the public build remains execution-disabled and the wallet dialog states that connection cannot request a trade, approval or transaction signature.

## Future AppKit re-evaluation

Re-evaluate only after Reown ships stable wagmi 3 support and documents an App Router SSR path compatible with this application. If that gate passes, the owner must create a Project ID at `dashboard.reown.com`, register the exact production and approved preview origins, and provide it through `NEXT_PUBLIC_REOWN_PROJECT_ID`. The ID is public configuration, not a signing secret. A future prototype must allow only Monad Mainnet 143 for production readiness and explicitly disable swaps, onramps, embedded/social accounts, delegated signing and unrelated payment features before the full MonMix acceptance suite is run.
