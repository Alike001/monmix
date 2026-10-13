# Transaction-ready threat model

## Assets and boundaries

The browser reads public chain state and can connect to an injected wallet. It never receives a private key. Mainnet execution is disabled by default. Strategy preferences and caps are browser-local advisory inputs, not enforceable permissions.

## Controls

| Threat | Control |
| --- | --- |
| Wrong RPC, wallet chain or account | Require chain 143 independently; bind each preflight and journal record to the checksummed account; refuse changes before wallet invocation. |
| Proxy upgrade or ABI drift | Verify the EIP-1967 implementation address and runtime bytecode hash before every preflight. Refuse any change pending review. |
| Price precision error | Cross-check packed 1e8 prices against x18 BBO and reject >1% disagreement; retain factor-of-ten regression. |
| Stale, malformed or empty market | Reject stale block timestamps, malformed packed words, zero/one-sided books and insufficient full-fill depth. |
| Market-size ambiguity | Normalize token atoms to 1e10 size precision with bigint math; enforce the declared 200 MON minimum even though the direct market-sell path accepts less. |
| Slippage or partial fill | First simulate for output, round the protected USDC floor down in atoms, then simulate the exact protected call with fill-or-kill true. |
| Quote ageing | Preparations expire after 20 seconds and are recreated immediately before the wallet opens. The contract itself has no deadline, which remains residual risk. |
| Insufficient balance or gas | Re-read wallet MON, estimate the exact call's gas and require sell value plus the quoted gas cost. Wallet/network fees can still change. |
| Duplicate action | In-memory click lock plus a persisted fingerprint refuse another active wallet/broadcast record. No automatic transaction retry. |
| Crash or reload | Write journal before the wallet, persist hash immediately, reconcile receipts on reload, and mark no-hash interruptions unresolved. |
| False confirmation | Accept success only from a successful receipt with at least one matching Kuru `Trade` event from the configured market/taker. |
| Misleading records | Simulation never enters activity. Rejected, reverted, unresolved and confirmed are distinct states. |
| Unbounded authority | No backend key, automation, approval, USDC buy, custom contract or unattended signer. Execution requires a build-time flag plus an explicit wallet confirmation. |

## Residual risk

- There is no onchain deadline between final simulation and execution.
- The pinned upgradeable implementation can legitimately change; the app will fail closed until reviewed and updated.
- RPCs and wallet extensions remain trusted software and can be unavailable or malicious.
- Browser local storage is durable convenience, not a canonical cross-device ledger.
- Daily limits are not reconstructed from all wallet activity and are not independently enforced.
- Fee fields currently read zero, but gas and future protocol changes can alter total cost.
- A real funded receipt and fill remain unverified until the owner separately approves a mainnet trade.
