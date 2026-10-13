# Evidence ledger

| Date | Claim | Evidence | Status |
| --- | --- | --- | --- |
| 2026-10-13 | Original Phase 0 preserved with 11 passing tests | Git commit `18a37432ffa3b3f985133414ae5af15a104e2f82` | Verified |
| 2026-10-13 | Monad RPC is chain 143 | `cast chain-id`; automated live check | Verified |
| 2026-10-13 | Market parameter/token/decimal tuple | Direct `eth_call`; `pnpm test:live` | Verified |
| 2026-10-13 | Real packed L2 near 0.0246, not 0.247 | Raw word decode at block `113012826`; BBO cross-check | Verified |
| 2026-10-13 | Read-only adapter compatible with current deployed market | Live test at block `113015337` | Verified |
| 2026-10-13 | All routes render in production server | HTTP 200 smoke test for six pages and market API | Verified |
| 2026-10-13 | No application transaction occurred during Phase 2 | Execution flag remained false; no wallet confirmation or send call invoked | Verified absence, not execution evidence |
| 2026-10-13 | Declared Kuru minimum is exactly 200 MON | Direct params read and precision boundary tests | Verified |
| 2026-10-13 | Direct market sell accepts sub-minimum calls | Read-only `eth_call` at 1 MON and 199.9999999999 MON | Verified; app fails closed at 200 MON |
| 2026-10-13 | Native sell ABI, native value, min-out and FOK simulation | Pinned SDK/source inspection plus exact live `eth_call` and gas estimate | Verified read-only |
| 2026-10-13 | Proxy implementation identity | EIP-1967 slot and runtime bytecode hash | Verified and pinned |
| 2026-10-13 | Transaction lifecycle is implemented but gated off | Source, negative tests, production UI | Verified in code; no funded proof |
| 2026-10-13 | Direct buy ABI, quote/base units, zero native value, FOK and output bound | Pinned public Kuru contract source plus live read-only quote calls | Verified read-only |
| 2026-10-13 | USDC identity, decimals, allowance and exact approval spender | Token reads, public-holder allowance read and approval simulation | Verified read-only |
| 2026-10-13 | Direct buy does not enforce declared `minSize` | Pinned source and tiny read-only quote call; product blocks simulated output below 200 MON | Verified; app fails closed |
| 2026-10-13 | Buy preparation against a public funded address | `pnpm test:live`: 5 USDC, allowance zero, exact approval simulation, >200 MON quoted output | Verified read-only; address is not controlled by project |
| Future | Funded approval and user-confirmed Kuru trade | Requires explicit owner approval and transaction receipts | Unverified on mainnet |
| Future | Enforceable caps and automation | Requires independently enforced authorization and revocation | Unverified / not implemented |
