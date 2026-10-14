# Owner-approved mainnet transaction runbook

This runbook is preparation only. It does not authorize a transaction. The release-candidate build keeps execution disabled. The owner must separately authorize the exact commit, direction, account, amount and session before the flag may change.

## Chosen first direction

Use a **native MON → USDC sell of exactly the venue's declared minimum, currently 200 MON**, only if the owner's portfolio decision independently recommends that direction at execution time.

Why sell first:

- it needs one wallet confirmation rather than an ERC-20 approval plus trade;
- native `msg.value`, calldata, output floor and receipt behavior have the strongest existing read-only evidence;
- it creates no residual token allowance;
- the amount is the smallest order that respects the declared venue floor.

If the strategy does not recommend a sell, the owner lacks the required balance, or 200 MON is not an acceptable risk, stop. Do not force the portfolio target or choose a buy merely to produce evidence.

## Release identity

Record before the session:

```text
Application commit: ________________________________
Local origin: http://127.0.0.1:______________________
Owner account: 0x___________________________________
UTC time: __________________________________________
Execution flag initially false: yes / no
```

Required chain/deployment identity:

```text
Monad chain ID: 143
Kuru MON/USDC proxy: 0x065C9d28E428A0db40191a54d33d5b7c71a9C394
Expected implementation: 0x5e3446c600524Be453bbCEFD46a9E4C9bE8899a0
Expected runtime hash: 0x6576ced90ca537c9aa058ea4a54ab5edd802ab78b834168b21fcc6d9ac392c0c
USDC: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603, 6 decimals
MON: native, 18 decimals
```

Run `pnpm test:live` immediately before session approval. Stop on any chain, proxy, implementation, code-hash, token, decimal, precision, stale-book or empty-book mismatch. Use the clean-commit, loopback-only procedure in [PHASE-5E-LOCAL-EXECUTION.md](PHASE-5E-LOCAL-EXECUTION.md); never enable the public Vercel build.

## Exact asset and order requirements

For a 200 MON sell:

```text
baseAmountAtoms = 200000000000000000000
sizeRaw = 2000000000000
isMargin = false
isFillOrKill = true
msg.value = 200000000000000000000 wei
required USDC input = 0
required USDC allowance = 0
```

The wallet must hold at least:

```text
200000000000000000000 wei + exact prepared maximumGasCostWei
```

Record the session values from the final preparation:

```text
Wallet MON balance: __________________ wei
Wallet USDC balance: _________________ atoms
Expected USDC output: ________________ atoms
Protected minimum USDC: ______________ atoms
Best bid / midpoint: _________________ / _________________ x18
Estimated price impact: ______________ bps
Kuru taker fee: ______________________ bps
Gas estimate: ________________________
Gas price: ___________________________ wei
Maximum gas cost: ____________________ wei
Preparation block: ___________________
Preparation expiry: __________________ UTC
```

`minimumQuoteAtoms` is the simulated output multiplied by 99.50%, rounded down in six-decimal USDC atoms. The exact protected FOK call must simulate successfully from the owner's account.

## Calldata review

Expected function:

```text
placeAndExecuteMarketSell(
  2000000000000,
  <recorded minimumQuoteAtoms>,
  false,
  true
)
```

Expected selector: `0x532c46db`.

Verify the wallet request destination is exactly the Kuru proxy and native value is exactly 200 MON. Reject any approval request, different destination, different value, margin flag, non-FOK flag, changed size or lower output floor.

The contract has **no onchain deadline**. The browser's 20-second expiry only controls whether the app opens a new wallet request. Once the request is in the wallet, the chain cannot enforce that browser timer. If confirmation is not immediate, the wallet remains open unusually long, the displayed values differ, the network/account changes, or the user is distracted, reject/close the request and prepare again. Never rely on the old wallet request after returning later.

## Confirmation checkpoints

1. Owner reviews this runbook and explicitly authorizes the recorded commit, account, 200 MON direction and maximum gas cost.
2. Confirm Vercel Production and Preview remain execution-disabled and complete real-extension read-only acceptance there.
3. Re-run deterministic, build, browser and live checks.
4. Owner explicitly authorizes the exact clean commit and a time-bounded, loopback-only local session. Use the guarded local launcher; do not change a tracked environment file or Vercel setting.
5. Connect the recorded account on chain 143.
6. Confirm the live strategy still recommends a MON sell; do not manipulate inputs solely to force it.
7. Run a new exact preparation. The final revalidation must preserve or improve the reviewed output floor and gas ceiling.
8. Open the wallet and compare destination, value and function data.
9. Owner alone confirms or rejects. No operator enters credentials or clicks for them.
10. Stop the local server immediately after the wallet returns a hash or rejection. Public deployment configuration remains false throughout.

## Outcome handling

- **Rejected:** record REJECTED without a hash. Stop; do not retry automatically.
- **Broadcast:** persist the hash immediately. Do not send another action while AWAITING_WALLET or BROADCAST exists for the account.
- **Confirmed:** require successful receipt status plus at least one sell-direction Kuru `Trade` event for the account from the verified market. Then read balances, actual network fee, USDC delta and resulting allocation.
- **Reverted:** record the receipt/block as REVERTED. Preserve evidence; do not retry blindly.
- **Unresolved/missing receipt:** retain the hash, mark UNRESOLVED and reconcile later. Never infer success from simulation, wallet UI or a submitted hash.
- **Successful receipt without matching sell Trade event:** mark UNRESOLVED and investigate before any further action.

## Evidence bundle

Preserve without secrets:

- exact Git commit and deployment URL;
- live-check output and preparation JSON;
- screenshots of the in-app review and wallet transaction fields;
- transaction hash, receipt status, block and gas;
- decoded direction-aware Kuru Trade events;
- before/after MON and USDC balances;
- before/after allocation at the recorded valuation price;
- journal export and explanation of any unresolved discrepancy.

## Residual allowance and shutdown

The chosen sell creates no USDC allowance. Still use Activity's live allowance check for the owner account. If a prior allowance exists, prepare a separate `approve(Kuru market, 0)` revocation, obtain separate owner authorization and wallet confirmation, and verify the exact zero-value Approval event. Never combine revocation with the sell or submit it silently.

After evidence capture:

1. Stop the loopback-only local server. Do not start it again under the same authorization.
2. Verify the public application still says “Mainnet execution disabled.”
3. Reconcile the transaction journal once more.
4. Archive the evidence bundle and record any residual allowance.
5. Do not run another transaction under this authorization.
