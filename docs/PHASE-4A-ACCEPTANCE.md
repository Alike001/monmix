# Phase 4A product and competitive acceptance

Date: 2026-10-13

## Product review: before and after

The Phase 3 product already had a coherent market-to-portfolio workflow, useful presets, responsive composition and truthful empty states. Phase 4A's material gap was capability asymmetry: excess MON could reach an exact direct-order preparation, while excess USDC ended at an informational review. Activity also described a single trade shape, and the portfolio's recurring health was distributed across several labels.

Phase 4A closes that gap without adding another dashboard:

- `/desk` keeps portfolio, target, drift reason, Kuru threshold and protected review in one workflow for both buy and sell directions.
- The strategy-health strip gives current allocation, desired allocation, observation age and adjustment eligibility together.
- A buy shows USDC spend, estimated MON, protected MON minimum, declared 200 MON floor, price impact, allowance, exact approval and simulation state before any wallet could open.
- The exact approval is a separate action and never silently continues into a buy.
- `/activity` distinguishes prepared, rejected, broadcast, confirmed, reverted, unresolved and reload-reconciled records. Approval, buy and sell use ordinary-language headings; raw chain evidence remains expandable.
- Confirmed trade records can retain actual wallet balance changes and resulting MON allocation valued at the preparation price. A simulation alone never creates those outcome fields.

The six routes were reviewed at 1440x1000 and 390x844. Automated coverage also runs at 375x812 and 768x1024. There is no horizontal overflow, the final content remains scroll-reachable above the phone safe area, and the fixed bottom navigation retains visible active state. Empty states are truthful and do not invent positions, trades or performance.

Screenshots are under `artifacts/screenshots/phase-4a/`, including the connected mocked-provider buy review in `desk-buy-mobile.png`. That image is product-composition evidence, not real-wallet evidence.

## Complete first-time journey

1. Read the landing page's promise: maintain a chosen MON/USDC mix through live Kuru data with the wallet remaining in user control.
2. Inspect the public MON/USDC market, spread, depth, minimum and freshness without connecting.
3. Connect an injected wallet and refuse any network other than Monad mainnet chain 143.
4. Read actual native MON and configured USDC balances for the connected public address.
5. Choose Balanced, MON forward, USDC buffer or a custom target; optionally edit advisory limits and save them in this browser.
6. Compare current and target allocation and read the deterministic WAIT, BLOCK or REVIEW explanation.
7. If REVIEW, compare proposed input, expected output, venue floor and visible depth.
8. Prepare the exact Kuru action from a fresh market and revalidated deployment. A sell reaches exact simulation immediately. A buy with insufficient allowance reaches exact approval review and truthfully leaves the account-bound buy simulation pending.
9. Observe that the default build disables every wallet write. Prepared evidence may appear in the browser-local journal but is explicitly unsigned.
10. After a future separately approved execution, reconcile a receipt and matching direction-aware Kuru Trade events before showing confirmed output and allocation change.

## Wallet acceptance

- Automated browser acceptance uses a mocked EIP-1193 injected provider with a public address, plus real read-only Monad balance and Kuru API calls.
- Disconnected, wrong-network, account-switch, wallet rejection, duplicate-action and reload recovery logic are covered in deterministic/browser tests.
- MetaMask is installed in local Chrome profiles, but no user profile was opened, unlocked or inspected. Therefore real-extension acceptance is **not passed** and must not be inferred from the mock.
- No wallet request, approval, signature, broadcast or paid action occurred.

## Product differentiation

This is a portfolio-management product rather than a generic DEX ticket because the action begins with a saved allocation target and measured drift, remains bounded by deterministic advisory rules, refuses uneconomic/unavailable states, and returns the outcome to wallet balances and allocation health. Kuru is the execution substrate, not the product definition.

Shijima-inspired behavior implemented independently:

- understandable strategy presets that remain editable;
- current and target allocation compared in one owner-controlled workflow;
- plain-language decision reasoning before technical proof;
- too-small-to-trade as a first-class state;
- outcome/history evidence supporting the portfolio decision.

Masayume-inspired UX implemented independently:

- market-first live venue context;
- stable, connected review ticket with adjacent financial amounts;
- account/network/availability remedies at the point of action;
- mobile action composition and active navigation;
- ordinary-language outcome with expandable technical evidence.

Kuru-specific infrastructure that is essential:

- the live Monad-native MON/USDC central-limit order book and packed depth;
- deployed market parameters, precision and declared minimum;
- direct native sell and ERC-20 quote buy functions;
- FOK behavior, output protection, allowance semantics and Trade events;
- proxy/implementation identity and chain-authoritative receipts.

Capabilities intentionally still missing:

- funded real-wallet approval/sell/buy evidence;
- canonical cross-device or full-wallet history;
- limit-order management, cancellation and multi-market portfolio support;
- an implemented/deployed opt-in watcher;
- independently enforceable automated limits, revocation and unattended execution;
- customer/adoption evidence and measured recurring retention.

## Track and sponsor fit

The product strongly fits Onchain Finance & Trading: it values a real portfolio from chain state, derives a deterministic rebalance, prepares real spot orders against a live Monad venue and is designed to prove outcomes from receipts.

It appears substantively aligned with Kuru's “Build the Next Consumer Trading App on Kuru” opportunity because Kuru's order book, market constraints, direct-order calls and Trade events are indispensable to the experience rather than decorative. The consumer differentiation is target-allocation maintenance rather than a generic swap. However, sponsor-specific submission criteria were not present in the local official rules export, and no mainnet fill has yet been produced. Do not claim the bounty is fully satisfied until the current official sponsor form is checked and Phase 4B produces transaction evidence.

Envio is not integrated. Adding it now would duplicate a browser-local journal without improving the first transaction. Reconsider only when canonical cross-device Kuru history or the watcher needs indexed events.

## Phase 4B gate

Before one real mainnet action: owner reviews the exact commit and deployed build, performs real-extension acceptance, chooses direction and maximum spend, funds only what is needed, verifies current proxy/code hash and market depth, and explicitly approves enabling execution for that session. A USDC buy additionally requires a separate exact approval confirmation, a new preparation after receipt, and a second explicit trade confirmation. Capture both receipts when applicable, verify direction-aware Trade events and balances, then disable the flag again. Never retry blindly.
