# Phase 4A current-reality brief

Date: 2026-10-13

## Repository baseline

- Starting commit: `658b18d97903266216f67633f9945925f544eca8`.
- Existing product: Next.js 16 / React 19 browser application, deterministic TypeScript policy package, minimal Viem Kuru adapter, injected Wagmi connector, local transaction journal and an execution-disabled native MON sell lifecycle.
- Existing Product Experience 3.0 source study: `docs/PRODUCT-EXPERIENCE-3-REFERENCES.md`.

## Kuru buy facts

- Deployed proxy: `0x065C9d28E428A0db40191a54d33d5b7c71a9C394`, Monad chain 143.
- Verified implementation/code hash remain the values pinned in `docs/INTEGRATIONS.md`.
- Public Kuru contract source inspected at `references/kuru-contracts-dex-public`, commit `2060bb2736080c175d80d568bfdb6226bb5abd04`, `contracts/OrderBook.sol:724-779`.
- `placeAndExecuteMarketBuy(uint96,uint256,bool,bool)` takes quote input at market price precision and returns base atoms.
- For MON/USDC, the quote token is six-decimal USDC, the base token is native MON, non-margin buy `msg.value` is zero, and USDC is pulled with `transferFrom`.
- The approval spender is the market proxy, not the margin account receiving funds.
- FOK reverts on any unspent quote remainder; minimum output is checked against base credited.
- Direct market buy does not enforce `minSize`. The product must independently refuse simulated MON output below the declared 200 MON venue minimum.
- The observed taker fee field is zero. The code handles the contract return as post-fee credited output and presents network gas separately.

## Live read-only evidence

`pnpm test:live` at block `113071779` verified chain, proxy, runtime code identity, token identity/decimals, live two-sided depth and both direct-order directions. A 5 USDC buy preparation for a public onchain address with zero allowance produced a >200 MON read-only quote and an exact 5 USDC approval simulation/gas estimate. The address is not controlled by this project and no state-changing call was made.

## Wallet acceptance boundary

The environment has no confirmed user-controlled browser wallet profile. Automated injected-provider tests are mocks and must not be reported as real extension acceptance. A funded, owner-controlled wallet approval and buy receipt remain unverified. Mainnet execution must stay disabled.

## Unresolved facts

- Real extension behavior across MetaMask-compatible wallets has not been manually accepted in this environment.
- No funded approval, sell or buy has established actual gas/receipt/fill behavior for a project wallet.
- The public contract is upgradeable; any implementation or code-hash change invalidates the current pin.
- There is no onchain deadline between simulation and inclusion.
- Browser strategy limits remain advisory and do not constrain the wallet or contract.
