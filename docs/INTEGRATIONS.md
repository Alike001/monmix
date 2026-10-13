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

## Reproduce without sending a transaction

```bash
cast chain-id --rpc-url https://rpc.monad.xyz
cast call 0x065C9d28E428A0db40191a54d33d5b7c71a9C394 \
  'getMarketParams()(uint32,uint96,address,uint256,address,uint256,uint32,uint96,uint96,uint256,uint256)' \
  --rpc-url https://rpc.monad.xyz
pnpm test:live
```

`pnpm test:live` reads the market and proxy, performs two `eth_call` simulations for a 200 MON fill-or-kill sell, and estimates gas. It never uses a key or invokes `eth_sendTransaction`.
