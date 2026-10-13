import { MarketPanel } from '@/features/market/market-panel';

export default function MarketsPage() {
  return (
    <div className="page">
      <header className="page-title">
        <span className="eyebrow">01 · Observe the venue</span>
        <h1>A market view with its assumptions exposed.</h1>
        <p>Raw Kuru order-book data is decoded against the deployed market parameters. If freshness, decimals, token addresses, or price scales disagree, the desk stops.</p>
        <div className="route-note"><span>Monad chain 143</span><span>•</span><span>No wallet required</span><span>•</span><span>10-second refresh</span></div>
      </header>
      <div className="market-layout">
        <MarketPanel />
        <aside className="card panel">
          <span className="eyebrow">What is verified</span>
          <h2>Two independent price scales.</h2>
          <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>Packed depth uses the market&apos;s 1e8 price precision. <code>bestBidAsk()</code> uses 1e18. The adapter normalizes both and rejects a divergence greater than 1%.</p>
          <div className="notice safe">This catches the researched 0.247 vs 0.0246 factor-of-ten error before it can affect portfolio value or a recommendation.</div>
          <div className="notice" style={{ marginTop: 12 }}>Depth shown here is the packed onchain L2 response. No chart history or volume metric is fabricated.</div>
        </aside>
      </div>
    </div>
  );
}
