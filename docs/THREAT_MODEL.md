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
| Buy unit confusion | Convert six-decimal USDC atoms to 1e8 price-precision units; protect output in 18-decimal MON atoms; require `msg.value = 0`. |
| Buy below the venue floor | Apply the declared 200 MON floor to simulated MON received. The direct buy does not enforce `minSize`, so the app refuses to use that omission as a bypass. |
| Excess token authority | Approve only the exact normalized USDC input to the verified market proxy. Approval and buy are separate confirmations; no unlimited approval or automatic follow-up trade. |
| Quote ageing | Preparations expire after 20 seconds, are recreated immediately before the wallet opens, and may not lower the reviewed output floor or raise its gas ceiling. The contract itself has no deadline, which remains residual risk. |
| Insufficient balance or gas | Re-read wallet MON, estimate the exact call's gas and require sell value plus the quoted gas cost. Wallet/network fees can still change. |
| Duplicate action | In-memory click lock plus an account-and-market journal lock refuse every concurrent wallet/broadcast action, even when a new block changes the preparation fingerprint. No automatic transaction retry. |
| Crash or reload | Write journal before the wallet, persist hash immediately, reconcile receipts on reload, and mark no-hash interruptions unresolved. |
| False confirmation | A sell additionally proves the full requested raw size and protected USDC wallet delta. A buy proves matching-direction Kuru fills and a gas-adjusted MON wallet delta at or above its protected minimum. Otherwise the record remains unresolved. |
| Residual USDC allowance | Read the live token allowance rather than inferring it from the journal. Prepare only `approve(verified market, 0)` after a separate simulation and wallet confirmation; require an exact zero-value Approval event. |
| Misleading records | Simulation never enters activity. Rejected, reverted, unresolved and confirmed are distinct states. |
| Unbounded authority | No backend key, automation, custom contract or unattended signer. Execution requires a build-time flag plus an explicit wallet confirmation; a buy requires a separately confirmed exact approval. |

## Residual risk

- There is no onchain deadline between final simulation and execution.
- The pinned upgradeable implementation can legitimately change; the app will fail closed until reviewed and updated.
- RPCs and wallet extensions remain trusted software and can be unavailable or malicious.
- Browser local storage is durable convenience, not a canonical cross-device ledger.
- Daily limits are not reconstructed from all wallet activity and are not independently enforced.
- Fee fields currently read zero, but gas and future protocol changes can alter total cost.
- An exact USDC approval remains usable by the verified market until consumed or changed. The recovery flow is available only for accounts already present in this browser's buy/approval journal, and revocation is still a paid, separately confirmed token transaction.
- A buy cannot be simulated as the connected account until its allowance exists. Before approval, only the zero-address quote call and exact approval simulation are verified; the app does not label that state transaction-ready.
- A real funded receipt and fill remain unverified until the owner separately approves a mainnet trade.
