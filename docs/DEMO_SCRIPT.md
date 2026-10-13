# Three-minute demo script

## 0:00–0:25 — promise

"Choose how much MON you want to hold. The desk reads Kuru, values your wallet and explains whether to wait, block or review a protected buy or sell—without moving funds in this release."

Show `/` and the live midpoint card.

## 0:25–0:55 — market truth

Open `/markets`. Point out chain 143, market address, live age, two-sided depth, price precision and the BBO cross-check. Briefly explain that the 10x regression test prevents the researched 0.247 error.

## 0:55–1:55 — portfolio journey

Open `/desk`; connect an injected wallet on Monad. Show real MON and USDC balances. Change target, drift and cap inputs to demonstrate `WAIT`, `BLOCK`, and `REVIEW`. Point out the 200 MON venue floor, exact output protection, gas ceiling, and either the native sell or exact-approval buy path.

## 1:55–2:25 — safety boundary

Emphasize that execution is disabled, preferences are advisory, and Kuru has no onchain execution deadline. Explain that any delayed wallet request must be rejected and prepared again. Switch to a wrong network briefly to show refusal if practical.

## 2:25–2:55 — evidence

Open `/activity` to show the honest browser-local state and residual-allowance check, then `/proof` for pinned contracts, reference SHAs, implemented evidence and the explicit list of missing funded execution proof.

## 2:55–3:00 — close

"Strategy Desk turns portfolio drift into a protected Kuru action under the owner's control. A receipt-backed trade is a separately authorized next gate, not a hidden demo claim."
