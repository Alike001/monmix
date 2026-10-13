import Link from 'next/link';
import { MarketHeroCard } from '@/features/market/market-hero-card';

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Target allocation, grounded on Monad</span>
          <h1>Your MON allocation, explained before anything moves.</h1>
          <p>Choose how much MON you want to hold. The desk values your wallet against Kuru&apos;s live MON/USDC order book, applies your limits, and can simulate the exact protected sell before your wallet sees it.</p>
          <div className="hero-actions"><Link className="button" href="/desk">Open strategy desk</Link><Link className="button secondary" href="/markets">Inspect the market</Link></div>
          <div className="route-note"><span>Live Kuru reads</span><span>•</span><span>Deterministic policy</span><span>•</span><span>Execution off by default</span></div>
        </div>
        <MarketHeroCard />
      </section>

      <section className="section">
        <div className="section-head"><div><span className="eyebrow">One focused journey</span><h2>Market → portfolio → review.</h2></div><p>The useful unit is not a dashboard tile. It is a recommendation whose market, math, and refusal conditions can be checked.</p></div>
        <div className="journey-grid">
          <article className="card journey-card"><span className="number">01 / MARKET</span><h3>Read the venue.</h3><p>Verify deployed tokens, decimal scales, freshness, spread, minimum size, and two-sided depth from Kuru on Monad.</p></article>
          <article className="card journey-card"><span className="number">02 / PORTFOLIO</span><h3>Apply your target.</h3><p>Read native MON and USDC balances from the connected address, then evaluate drift and advisory budgets with integer math.</p></article>
          <article className="card journey-card"><span className="number">03 / REVIEW</span><h3>Prove the action is viable.</h3><p>Receive WAIT, BLOCK, or REVIEW, then simulate the exact native MON sell with output protection, gas, contract identity, and visible failure conditions.</p></article>
        </div>
      </section>

      <section className="card safety-strip">
        <div className="acid"><span className="eyebrow">Honest by construction</span><h2>Ready to verify. Not enabled to spend.</h2><p>The transaction lifecycle is implemented for native MON sells, but its build-time gate is off. A TypeScript preference is never described as an enforced financial restriction.</p></div>
        <div className="dark-card"><ul className="safety-list"><li>No backend key, automation, token approval, blind retry, or unsigned server-side action.</li><li>Stale prices, wrong accounts, proxy changes, a sub-200 MON action, inadequate liquidity, or failed simulation stop preparation.</li><li>The browser journal shows only wallet requests, hashes, receipts, and verified Kuru Trade events that actually exist.</li></ul></div>
      </section>
    </div>
  );
}
