# Evidence ledger

| Date | Claim | Evidence | Status |
| --- | --- | --- | --- |
| 2026-10-13 | Original Phase 0 preserved with 11 passing tests | Git commit `18a37432ffa3b3f985133414ae5af15a104e2f82` | Verified |
| 2026-10-13 | Monad RPC is chain 143 | `cast chain-id`; automated live check | Verified |
| 2026-10-13 | Market parameter/token/decimal tuple | Direct `eth_call`; `pnpm test:live` | Verified |
| 2026-10-13 | Real packed L2 near 0.0246, not 0.247 | Raw word decode at block `113012826`; BBO cross-check | Verified |
| 2026-10-13 | Read-only adapter compatible with current deployed market | Live test at block `113015337` | Verified |
| 2026-10-13 | All routes render in production server | HTTP 200 smoke test for six pages and market API | Verified |
| 2026-10-13 | No application transaction occurred | No write capability; empty activity screen | Verified absence, not execution evidence |
| Future | Approval and user-confirmed Kuru trade | Requires explicit owner approval and transaction receipt | Unverified / not implemented |
| Future | Enforceable caps and automation | Requires independently enforced authorization and revocation | Unverified / not implemented |
