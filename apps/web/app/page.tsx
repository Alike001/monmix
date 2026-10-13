import Link from 'next/link';
import { MarketHeroCard } from '@/features/market/market-hero-card';

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Your crypto, your mix.</span>
          <h1>Keep your MON mix on target.</h1>
          <p>MonMix helps you keep your MON and USDC holdings aligned with your goals. Choose your target allocation, see when your portfolio drifts, and review protected trades through Kuru to rebalance—all while keeping control of your wallet.</p>
          <div className="hero-actions"><Link className="button" href="/desk">Open MonMix</Link><Link className="button secondary" href="/markets">Inspect the market</Link></div>
          <div className="route-note"><span>Live Kuru reads</span><span>•</span><span>Deterministic policy</span><span>•</span><span>Execution off by default</span></div>
        </div>
        <MarketHeroCard />
      </section>

      <section className="section">
        <div className="section-head"><div><span className="eyebrow">One focused journey</span><h2>Market → portfolio → review.</h2></div><p>The useful unit is not a dashboard tile. It is a recommendation whose market, math, and refusal conditions can be checked.</p></div>
        <div className="journey-grid">
          <article className="card journey-card"><span className="number">01 / MARKET</span><h3>Read the venue.</h3><p>Verify deployed tokens, decimal scales, freshness, spread, minimum size, and two-sided depth from Kuru on Monad.</p></article>
          <article className="card journey-card"><span className="number">02 / PORTFOLIO</span><h3>Apply your target.</h3><p>Read native MON and USDC balances from the connected address, then evaluate drift and advisory budgets with integer math.</p></article>
          <article className="card journey-card"><span className="number">03 / REVIEW</span><h3>Prove the action is viable.</h3><p>Receive WAIT, BLOCK, or REVIEW, then prepare the exact Kuru buy or sell with output protection, gas, contract identity, allowance state, and visible failure conditions.</p></article>
        </div>
      </section>

      <section className="card safety-strip">
        <div className="acid"><span className="eyebrow">Honest by construction</span><h2>Ready to verify. Not enabled to spend.</h2><p>Two-way transaction preparation, exact USDC allowance review, recovery, and receipt reconciliation are implemented, but the build-time execution gate is off. Browser preferences are never described as enforced financial restrictions.</p></div>
        <div className="dark-card"><ul className="safety-list"><li>No backend key, automation, blind retry, unlimited approval, or unsigned server-side action.</li><li>Stale prices, wrong accounts, proxy changes, a sub-200 MON result, inadequate liquidity, or failed simulation stop preparation.</li><li>The browser journal distinguishes preparation from wallet requests, hashes, receipts, and verified Kuru events that actually exist.</li></ul></div>
      </section>
    </div>
  );
}
