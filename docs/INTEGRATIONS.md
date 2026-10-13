# Integration evidence

Verified read-only on 2026-10-13 against `https://rpc.monad.xyz`.

## Monad and Kuru

| Read | Verified value |
| --- | --- |
| `eth_chainId` | `143` |
| Kuru market | `0x065C9d28E428A0db40191a54d33d5b7c71a9C394` |
| `pricePrecision` | `100000000` (`1e8`) |
| `sizePrecision` | `10000000000` (`1e10`) |
| base / decimals | zero address / `18` |
| quote / decimals | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` / `6` |
| tick / min / max raw size | `100` / `2000000000000` / `2000000000000000000` |
| fee fields | `0` / `0` from this market call; not a promise of total execution cost |

At block `113012826`, packed L2 top values were bid `2460700 / 1e8 = 0.02460700` and ask `2463700 / 1e8 = 0.02463700`. An independent BBO read returned values on the 1e18 scale near the same price. A later automated live check at block `113015337` returned bid `24512000000000000 / 1e18 = 0.024512` and ask `24536000000000000 / 1e18 = 0.024536`, status `LIVE`, age 0 seconds.

The conflicting `~0.247` feasibility value was therefore a factor-of-ten normalization error, not a second live market price.

## ABI and SDK decision

The deployed market responds to the legacy three-function read shape: `getMarketParams()`, zero-argument packed `getL2Book()`, and x18 `bestBidAsk()`. The pinned new TypeScript SDK defines a different generation in which `getL2Book(levels)` returns arrays and BBO values are `uint32`. It is also `UNLICENSED`. The application therefore uses an independently declared minimal read-only ABI and does not import either Kuru SDK.

## Reproduce raw reads

```bash
cast chain-id --rpc-url https://rpc.monad.xyz
cast call 0x065C9d28E428A0db40191a54d33d5b7c71a9C394 \
  'getMarketParams()(uint32,uint96,address,uint256,address,uint256,uint32,uint96,uint96,uint256,uint256)' \
  --rpc-url https://rpc.monad.xyz
cast call 0x065C9d28E428A0db40191a54d33d5b7c71a9C394 \
  'bestBidAsk()(uint256,uint256)' --rpc-url https://rpc.monad.xyz
```
