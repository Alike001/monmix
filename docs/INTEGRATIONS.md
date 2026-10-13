# Integration evidence

Verified through read-only Monad RPC calls on 2026-10-13. The primary public endpoint was intermittently unavailable; the complete live suite passed through Monad's documented `https://rpc-mainnet.monadinfra.com` endpoint. The application uses both endpoints as a read fallback unless an operator supplies one explicitly. No transaction was signed or sent.

## Deployed MON/USDC market

| Read | Verified value |
| --- | --- |
| chain ID | `143` |
| market proxy | `0x065C9d28E428A0db40191a54d33d5b7c71a9C394` |
| EIP-1967 implementation | `0x5e3446c600524be453bbcefd46a9e4c9be8899a0` |
| implementation runtime hash | `0x6576ced90ca537c9aa058ea4a54ab5edd802ab78b834168b21fcc6d9ac392c0c` |
| price / size precision | `1e8` / `1e10` |
| base / decimals | native MON zero address / `18` |
| quote / decimals | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` / `6` |
| tick / min / max raw size | `100` / `2000000000000` / `2000000000000000000` |
| normalized declared minimum | `200 MON` |
| taker / maker fee fields | `0` / `0`; network gas remains separate |

Packed L2 prices use `pricePrecision = 1e8`; `bestBidAsk()` uses `1e18`. The adapter normalizes both and refuses more than 1% disagreement. This proves the researched `~0.247` observation was a factor-of-ten scaling error rather than another current price.

## Direct native sell

The verified minimal interface is:

```text
placeAndExecuteMarketSell(uint96 size, uint256 minAmountOut, bool isMargin, bool isFillOrKill)
  payable returns (uint256 quoteCredited)
```

- `size` is MON amount at `sizePrecision = 1e10`.
- For a non-margin native MON sell, `msg.value` is the same normalized amount at 18 token decimals.
- `minAmountOut` is USDC atoms at 6 decimals.
- `isMargin = false`; `isFillOrKill = true`.
- The return value is the simulated credited quote amount in USDC atoms.
- A receipt is accepted only when emitted `Trade` logs come from the configured market and identify the connected account as taker.

Read-only boundary calls showed `199.9999999999 MON`, exactly `200 MON`, and `1 MON` all enter the market-sell path successfully when liquidity is available. Therefore the deployed market-sell function does **not** itself enforce `minSize`; the public contract implementation also applies `minSize` to resting orders, not this market function. Strategy Desk deliberately applies the market's declared 200 MON minimum before simulation and offers no bypass.

For an exact 200 MON call, a zero-floor `eth_call` returned roughly 4.86 USDC at the observed live book. A protected call and gas estimation also succeeded. These values are observations only and are never embedded as live application data.

Fill-or-kill semantics were checked against Kuru's public contract source: any unfilled remainder reverts when the flag is true. `minAmountOut` is checked after matching. The function has no deadline parameter, so Strategy Desk expires a preparation after 20 seconds and runs a fresh exact simulation immediately before opening the wallet. This is an application control, not an onchain deadline.

## ABI and SDK decision

The pinned ISC legacy SDK confirms the callable signature and unit conversions. The current Kuru TypeScript SDK targets a different interface generation and is `UNLICENSED`. Neither SDK is imported. The application uses independently declared minimal ABIs compatible with the observed proxy.

## Direct USDC buy

The verified minimal interface is:

```text
placeAndExecuteMarketBuy(uint96 quoteSize, uint256 minAmountOut, bool isMargin, bool isFillOrKill)
  payable returns (uint256 baseCredited)
```

This was checked against `contracts/OrderBook.sol:724-779` in the pinned public Kuru contracts repository at `2060bb2736080c175d80d568bfdb6226bb5abd04` and through live read-only calls:

- `quoteSize` is the USDC input represented at `pricePrecision = 1e8`, not six-decimal token atoms. The adapter normalizes between the two with bigint arithmetic.
- `minAmountOut` and the return value are native MON atoms at 18 decimals.
- The configured quote asset is USDC `0x754704Bc059F8C67012fEd69BC8A327a5aafb603`, whose live `decimals()` and `symbol()` returned `6` and `USDC`.
- The non-margin USDC path requires `msg.value = 0` and calls `safeTransferFrom` from the user to Kuru's margin account. Because the call executes through the proxy, the required approval spender is the market proxy `0x065C...C394`.
- An unfilled quote remainder reverts when `isFillOrKill = true`; `minAmountOut` is checked against MON credited after matching and taker-fee deduction.
- `minSize` is not referenced by the direct market-buy function. A one-atom USDC read-only quote therefore succeeds. Strategy Desk nevertheless requires the simulated credited MON to be at least the market's declared 200 MON minimum and offers no bypass.

At block `113071779`, a read-only Phase 4A check for a public address (used only as an `eth_call` sender) normalized `5.000000 USDC` to `500000000` price units and quoted approximately `205.47 MON`. Its allowance was zero, so the exact buy correctly remained pending. The exact `5.000000 USDC` approval call simulated and estimated successfully. This is not approval, signing, broadcast, custody, or funded-project-wallet evidence, and the observed quote is not embedded in application code.

The buy preparation has two honest stages:

1. With insufficient allowance, verify the quote, 200 MON product floor, protected output, token balance, exact allowance deficit and exact approval simulation. Do not claim the exact account-bound buy simulation passed.
2. After a separately confirmed exact approval, create a new preparation and simulate/estimate the exact account-bound FOK buy. Only that state can become transaction-ready when the execution gate is separately enabled.

If approval succeeds but the buy is abandoned or fails, the allowance may remain. The Activity page can read `allowance(owner, Kuru market)` from the verified six-decimal USDC contract. When it is nonzero, it can prepare and simulate the exact recovery call `approve(Kuru market, 0)`. Revocation is its own journal action and wallet confirmation; no trade follows it and no revocation is sent automatically.

## Execution-time freshness boundary

The direct buy and sell ABI has no deadline argument. The 20-second browser expiry is therefore a pre-wallet control, not an onchain guarantee. A final preparation must keep the same account, market and calldata identity; it may not reduce the reviewed output floor or increase the reviewed gas ceiling. After the wallet request opens, a delayed confirmation can still execute against later state subject only to FOK and `minAmountOut`. The owner must reject a request that was not reviewed and confirmed immediately, then prepare a new one.

## Reproduce without sending a transaction

```bash
cast chain-id --rpc-url https://rpc.monad.xyz
cast call 0x065C9d28E428A0db40191a54d33d5b7c71a9C394 \
  'getMarketParams()(uint32,uint96,address,uint256,address,uint256,uint32,uint96,uint96,uint256,uint256)' \
  --rpc-url https://rpc.monad.xyz
pnpm test:live
```

`pnpm test:live` reads the market, proxy and USDC token; performs protected sell and buy-side quote calls; simulates the exact required approval; and estimates available gas paths. It never uses a key or invokes `eth_sendTransaction`.
