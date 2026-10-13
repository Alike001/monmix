# Phase 4B-1 current-reality brief

Date: 2026-10-13  
Starting commit: `ef353a94a66a80cc54181b622da732699fd677f9`

## Verified repository facts

- The repository began clean at the requested commit and retains the Phase 4A domain, Kuru adapter, Next.js application, browser journal, two-way preparation and default-off execution gate.
- The runtime imports independently declared minimal ABIs. It does not depend on either Kuru SDK and does not import Shijima or Masayume code or assets.
- Native sells call `placeAndExecuteMarketSell(uint96,uint256,bool,bool)` with native value equal to normalized MON input, `isMargin=false` and `isFillOrKill=true`.
- USDC buys call `placeAndExecuteMarketBuy(uint96,uint256,bool,bool)` with price-precision quote units, MON-atom output protection, `msg.value=0`, and an allowance whose spender is the verified Kuru market proxy.
- The market declares a 200 MON minimum. The direct market functions do not enforce that parameter; the product deliberately does for both sold MON and simulated received MON.
- Both direct calls have no deadline parameter. The 20-second expiry is browser behavior only.
- Mainnet execution remains disabled by default. No wallet signature, approval, revocation, broadcast, transfer or deployment occurred in this work.

## Release audit findings

1. The persisted duplicate guard was keyed too narrowly to a block-dependent preparation fingerprint. A newer block could produce a second fingerprint while an earlier action for the same account and market was active.
2. Review freshness labels used a non-ticking render time and could remain visually fresh after expiry.
3. Final preparation recreated current state but did not require its output floor and gas ceiling to be at least as protective as the values the user reviewed.
4. A successful receipt with a direction-matching Trade event was not enough to prove the full protected wallet outcome.
5. The exact-approval buy flow truthfully exposed allowance but lacked a live residual-allowance read and explicit zero-allowance recovery path.
6. Missing injected-provider feedback and several public descriptions lagged the implemented two-way product.
7. Real MetaMask-compatible extension acceptance has not occurred. Existing browser coverage uses an EIP-1193 mock and must not be described as extension evidence.

## Resolved facts

- Active actions are now serialized by checksummed account and market, independent of preparation fingerprint.
- The UI clock advances while a review is open; an expired review cannot invoke a wallet.
- A fresh sell, buy, approval or revocation preparation must preserve identity and cannot silently weaken reviewed output or raise the reviewed gas ceiling.
- Sell confirmation requires the full requested raw fill plus the protected USDC wallet delta. Buy confirmation requires matching buy fills plus a gas-adjusted MON wallet delta meeting the protected floor. Ambiguous outcomes remain `UNRESOLVED`.
- Activity can read live USDC allowance for journaled buy accounts and prepare exactly `approve(verified market, 0)` as a distinct, gated action with exact event verification.
- The public UI and docs state that browser expiry is not contract-enforced and that delayed wallet requests must be rejected.

## Inferences

- A native MON sell at exactly 200 MON is the lowest-complexity first funded proof because it avoids ERC-20 allowance and needs one wallet confirmation. It is still appropriate only if the owner's live strategy recommends a sell and the owner accepts the amount and gas.
- The release can be published safely with execution false after owner-selected GitHub/Vercel destinations and a deployed smoke test. It is transaction-prepared, not transaction-proven.
- A useful closed-browser watcher should begin as an explicitly consented read-only email service, not as a signer or automation service.

## Remaining unknowns and owner-dependent evidence

- Real extension discovery, account selection, chain switching, rejection and disconnect behavior on the final HTTPS origin.
- A funded exact simulation after an actual USDC approval, and any receipt-backed buy or sell outcome.
- Final GitHub repository, Vercel team/project, public URLs and submission URLs.
- Current official submission-form fields and final sponsor acceptance decision at submission time.
- Operating cost and reliability of a deployed 15-minute watcher at real subscription volume.
