# Product Experience 3.0 reference notes

This implementation studies product principles from pinned, read-only reference repositories. It does not import their source, branding, layouts, copy, or assets.

## Pinned sources

- Shijima: `393cf8ad37d637d6d7264e58bed4747809fa6e67`
- Masayume: `68f7a09031a1f78927d0cb4bacba5f182bfcad38`
- Kuru TypeScript SDK: `8588784c4d54183a04029cb1b513910c806905a9`
- Kuru legacy SDK: `636509c2eafd63479d3f399703354e0d09f51e18`

License and provenance details remain in `THIRD_PARTY_NOTICES.md` and the Phase 0 provenance records. The application continues to use its independently declared minimal Kuru ABI.

## Shijima patterns studied

- `apps/web/features/strategies/StrategiesScreen.tsx` and `packages/shared/src/presets.ts`: creation starts with understandable presets, but the owner can edit the resulting allocation and limits. Product Experience 3.0 independently uses three two-asset starting points plus Custom.
- `apps/web/features/agent/Portfolio.tsx`: current allocation and target are shown in the same holding view, with a visual target marker and expandable evidence. Strategy Desk now places current mix, target mix, and drift together.
- `apps/web/features/agent/LatestDecision.tsx`: the decision leads with the action and a plain-language reason, then exposes proof. The desk now leads with WAIT, BLOCK, or REVIEW and keeps reason codes secondary.
- `apps/web/features/agent/TooSmallToTrade.tsx`: an undersized trade is treated as a product state with a named remedy, not a silent no-op. Strategy Desk now compares the proposed amount with Kuru's 200 MON minimum and explains what must change.
- `apps/web/app/agents/[slug]/page.tsx`: decision and portfolio are the primary hierarchy; owner controls and history support them. `/desk` now follows that hierarchy without reproducing Shijima's page layout.
- `apps/web/components/shell/app/AppShell.tsx`: mobile navigation has active state and dedicated phone-safe chrome. Strategy Desk now has active route state, safe-area spacing, and scroll-reachability tests.

## Masayume patterns studied

- `web/src/features/markets/ticket/Ticket.tsx`: every route feeds one stable ticket shape; quote changes update numbers rather than reshaping the workflow. Strategy Desk's decision and protected preview use a stable sequence and vocabulary.
- `web/src/features/markets/ticket/ReadoutStrip.tsx`: the essential financial amounts remain adjacent and have one freshness/status caption. The Kuru preview now groups sell amount, estimated receipt, protected minimum, price impact, fee, and freshness.
- `web/src/features/markets/ticket/AccountGate.tsx`: disconnected, underfunded, and unavailable states explain the remedy at the point of action. Strategy Desk keeps wrong-network, insufficient-market-size, and unavailable-liquidity remedies beside the decision.
- `web/src/features/markets/balance/BalancePlateView.tsx`: loading, stale-last-good, error, and retry are first-class balance states. Existing honest market/balance boundaries were retained.
- `web/src/components/shell/header/MobileBottomNav.tsx`: mobile navigation shows active destination and separates fast destinations from complete navigation. This product has only four primary routes, so it independently keeps all four visible rather than copying the drawer.
- `web/src/components/receipt/Receipt.tsx` and `web/src/features/markets/history/HistoryRow.tsx`: ordinary-language outcome and proof are primary; raw transaction evidence is secondary. Activity records now show attempted/received/protected amounts and put identifiers in an expandable section.

## Original product decisions

- The product remains a deterministic MON/USDC allocation desk, not an agent or prediction-market interface.
- Presets affect only the target input. The Phase 0 strategy engine remains authoritative.
- Browser preferences remain advisory and local. They are not described as contract-enforced restrictions.
- The default “ignore below” value is one USDC atom (`$0.000001`), the smallest valid positive Phase 0 policy input. Kuru's live declared minimum therefore remains the practical venue floor, avoiding the old $5 preference incorrectly blocking a valid 200 MON order when MON trades below $0.025.
- Execution remains build-time disabled. No reference code is used for signing, wallet writes, or transaction handling.
