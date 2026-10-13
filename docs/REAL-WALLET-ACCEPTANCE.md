# Real injected-wallet acceptance

Status: automated provider behavior is covered; owner-attended MetaMask-compatible extension acceptance remains pending. No wallet may be unlocked or operated unattended.

## Safe setup

1. Owner opens a fresh browser profile with a MetaMask-compatible injected wallet they control.
2. Use a public address suitable for read-only testing. Do not enter or reveal a seed phrase or private key to the application, terminal, recording or operator.
3. Keep `NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false` in the build under test.
4. Open the exact release-candidate deployment over HTTPS and verify its origin before connecting.
5. Record browser, wallet-extension version, application commit, account address, chain ID and timestamp. Do not record secrets.

## Acceptance cases

| Case | Steps | Required result | Current evidence |
| --- | --- | --- | --- |
| Provider discovery | Open `/desk` with and without the extension | Missing provider is explained; detected provider offers Connect | Automated browser mock; real extension pending |
| Account selection | Select an account in the wallet | UI shows the selected shortened address and only that address's balances | Automated mock; real extension pending |
| Correct network | Connect on chain 143 | Portfolio becomes readable without signature | Automated mock/read-only RPC; real extension pending |
| Wrong network | Connect on another chain | No recommendation from mixed-chain balances; Switch to Monad is offered | Unit/browser behavior; real extension pending |
| Chain switch | Approve `wallet_switchEthereumChain` to 143 | UI transitions to connected Monad state and reloads balances | Mock plan only; real extension pending |
| Reject chain switch | Reject the request | Wrong-network refusal remains; no stale recommendation or write | Manual pending |
| Balance accuracy | Compare displayed MON/USDC with wallet and Monad RPC | Exact atom reads agree after formatting | Live RPC adapter verified; owner account pending |
| Connected review | Change target to create WAIT, BLOCK and REVIEW | Recommendation uses the selected account and fresh Kuru state | Mocked injected-provider test; real extension pending |
| Disconnect | Use the app disconnect control | Portfolio/recommendation return to disconnected state; no old address data remains actionable | Unit/browser behavior; real extension pending |
| Account switch | Switch accounts after preparation | Final context guard refuses the old preparation | Unit coverage; real extension pending |
| Wallet rejection | With an execution-enabled owner-reviewed build only, reject the request | Journal records REJECTED without a hash and sends no retry | Unit coverage; live manual deferred to Phase 4B |

## Evidence classification

- A mocked EIP-1193 provider proves application state handling, not extension compatibility.
- Public RPC balance and contract reads prove chain integration, not wallet acceptance.
- Real-extension acceptance requires the owner to operate the extension and observe the result. Until that happens, the release notes must say **pending**, not passed.
- No signature or transaction is required for the Phase 4B-1 read-only acceptance session.
