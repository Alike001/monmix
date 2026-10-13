# Monad trading desk: product brief (working title, not brand)

## User promise, in 30 seconds
"Choose how much MON you want to hold. Set a trading budget and a drift threshold. The desk checks your portfolio against a live Kuru market and proposes or, only after safe authorization is proven, carries out the adjustment. Every action shows its real state and receipt. You can pause or withdraw under the correct ownership rules."

This is a **Shijima-inspired portfolio-management workflow** paired with **Masayume-inspired market and order UX**, built independently for Monad's Kuru exchange. The initial product is not an AI coin-picking system and will not make unsupported profit predictions.

## Customer
A Monad spot holder who wants target allocation maintained without manually calculating every trade and continuously watching a chart.

## Differentiation hypothesis, to validate
An integrated target-allocation plan with usable market previews, user-defined caps and an auditable execution record. Stop-loss orders, limit orders, AI bots and standard swaps already exist. This combination is NOT claimed to be novel or proven in market demand.

## One complete user journey
1. Browse a verified Kuru market with no wallet, see actual quote depth, spread, order minimum and data age.
2. Connect a supported wallet and read actual balance, network and supported market. Explicitly label live, paper, or unavailable status.
3. Create a spot allocation plan: target percentage of base token, drift trigger, cap per trade and per day, min size, slippage, and pause control.
4. Preview the deterministic decision, including quote, fees, slippage, available balance and explicit reason codes.
5. Sign/approve according to the verified Kuru flow. Start with **user-confirmed order execution**. Do not claim the plan runs autonomously yet.
6. Confirm the order's status from chain/indexer: broadcast -> included -> filled/partial/open/cancelled or reverted. A receipt and market context are visible.
7. Turn off the plan, revoke any signing permission and recover balances using correct Kuru wallet/subaccount mechanics.

## UX routes (in priority order)
- `/` a 30-second explanation and read-only working snapshot from a real supported Kuru market; no fake metrics
- `/markets` market depth and order preview; stale/unavailable state visible
- `/desk` personal allocation, target slider, budget caps, preview, controls
- `/activity` action history with reason codes, transaction hashes and corrections
- `/proof` actual chain, SDK, deployment and security evidence for judges
- `/docs` limitations, risk, setup and integration details

## Cut scope from v1
- Stock tokens, tokenization, perpetual futures, games, social feeds, copy trading, X trading and prediction markets
- AI-powered selection and price prediction
- Multiple venue routing or yield optimization
- Unattended execution until there is an enforceable bound beyond server policy

## Hackathon track and bounties
Primary: Track 1 Onchain Finance & Trading.
Potential: Kuru focused spot trading product, Envio if order-event indexing directly powers the core product. Additional bounties only if prerequisites are met without distorting the experience. Need inspect final sponsor fields.

## What product completion means
A user can repeat the actual wallet-to-order-to-receipt journey on a documented Monad network without developer intervention. The public repo reproduces builds/tests; honest failure states are part of the user journey. A mock run or a static presentation does not count.
