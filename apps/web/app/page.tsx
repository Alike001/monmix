import Link from 'next/link';
import { MarketHeroCard } from '@/features/market/market-hero-card';

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Target allocation, grounded on Monad</span>
          <h1>Your MON allocation, explained before anything moves.</h1>
          <p>Choose how much MON you want to hold. The desk values your connected wallet against Kuru&apos;s live MON/USDC order book, applies your limits, and prepares a read-only trade review.</p>
          <div className="hero-actions"><Link className="button" href="/desk">Open strategy desk</Link><Link className="button secondary" href="/markets">Inspect the market</Link></div>
          <div className="route-note"><span>Live Kuru reads</span><span>•</span><span>Deterministic policy</span><span>•</span><span>Zero transaction capability</span></div>
        </div>
        <MarketHeroCard />
      </section>

      <section className="section">
        <div className="section-head"><div><span className="eyebrow">One focused journey</span><h2>Market → portfolio → review.</h2></div><p>The useful unit is not a dashboard tile. It is a recommendation whose market, math, and refusal conditions can be checked.</p></div>
        <div className="journey-grid">
          <article className="card journey-card"><span className="number">01 / MARKET</span><h3>Read the venue.</h3><p>Verify deployed tokens, decimal scales, freshness, spread, minimum size, and two-sided depth from Kuru on Monad.</p></article>
          <article className="card journey-card"><span className="number">02 / PORTFOLIO</span><h3>Apply your target.</h3><p>Read native MON and USDC balances from the connected address, then evaluate drift and advisory budgets with integer math.</p></article>
          <article className="card journey-card"><span className="number">03 / REVIEW</span><h3>See the bounded action.</h3><p>Receive WAIT, BLOCK, or REVIEW with visible reasons, estimated book depth, and no hidden signing or transaction step.</p></article>
        </div>
      </section>

      <section className="card safety-strip">
        <div className="acid"><span className="eyebrow">Honest by construction</span><h2>This release cannot trade.</h2><p>Milestone 1 separates observation and recommendation from execution. A TypeScript REVIEW is deliberately not presented as enforceable permission.</p></div>
        <div className="dark-card"><ul className="safety-list"><li>No private-key input, wallet-client, approval, write ABI, or broadcast route.</li><li>Stale prices, wrong networks, malformed depth, precision disagreement, and inadequate liquidity refuse the review.</li><li>Activity and proof pages show only evidence that exists—no fabricated orders, fills, or transaction hashes.</li></ul></div>
      </section>
    </div>
  );
}
