# Real injected-wallet acceptance

Status: automated provider behavior is covered; owner-attended MetaMask-compatible extension acceptance remains pending. No wallet may be unlocked or operated unattended.

## Safe setup

1. Owner opens a fresh browser profile with a MetaMask-compatible injected wallet they control.
2. Use a public address suitable for read-only testing. Do not enter or reveal a seed phrase or private key to the application, terminal, recording or operator.
3. Confirm Preview and Production both set `NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false`, then verify the deployment was built by `pnpm build:release`.
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
| Market and allocation | Compare `/markets`, wallet amounts, total value and MON percentage against independent read-only RPC calculations | Fresh Kuru values and bigint allocation agree; unavailable data never becomes a recommendation | Adapter/browser coverage; owner account pending |
| Strategy selection | Select Balanced, MON forward, USDC buffer and Custom; save and reload | Target changes are understandable and persist only in this browser | Browser coverage; real extension pending |
| Exact sell simulation | With at least 200 MON and a genuine sell recommendation, prepare the sell | Exact value/calldata, FOK, output floor, gas and deployment identity appear; no wallet opens | Live public-call simulation verified; owner account pending |
| Buy preparation | With enough USDC and a genuine buy recommendation, prepare the buy | Quote units, expected/protected MON, spender and exact allowance requirement appear; no wallet opens | Mocked browser plus live public-call quote; owner account pending |
| Exact buy simulation | If the selected account already has sufficient exact allowance, prepare again | Account-bound FOK buy simulation and gas appear without a signature request | Pending a suitable owner-controlled account; do not approve during this phase |
| No existing buy allowance | Prepare a buy from an account without allowance | UI truthfully stops at exact approval required; it does not claim the account-bound buy simulation passed | Automated/live read-only evidence; real extension pending |
| Expired review | Leave a preparation open for more than 20 seconds | Review becomes expired and cannot open the wallet; prepare again is required | Unit/browser behavior; real extension pending |
| Disconnect | Use the app disconnect control | Portfolio/recommendation return to disconnected state; no old address data remains actionable | Unit/browser behavior; real extension pending |
| Account switch | Switch accounts after preparation | Final context guard refuses the old preparation | Unit coverage; real extension pending |
| No signing while disabled | Inspect extension activity throughout connect, switch and both preparations | Account permission and chain-switch prompts may occur; no message signature, approval, transaction or `eth_sendTransaction` request occurs | Manual network/extension evidence pending |

## Evidence classification

- A mocked EIP-1193 provider proves application state handling, not extension compatibility.
- Public RPC balance and contract reads prove chain integration, not wallet acceptance.
- Real-extension acceptance requires the owner to operate the extension and observe the result. Until that happens, the release notes must say **pending**, not passed.
- No signature, approval or transaction is required—or permitted—for the Phase 5A acceptance session.
- Exact account-bound buy simulation is possible only when a sufficient allowance already exists. If it does not, record that case as blocked by allowance rather than creating one.
