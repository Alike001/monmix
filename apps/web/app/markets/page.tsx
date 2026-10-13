import type { Metadata } from 'next';
import { MarketPanel } from '@/features/market/market-panel';

export const metadata: Metadata = { title: 'Live MON / USDC market', description: 'Inspect the verified Kuru MON/USDC order book on Monad mainnet.' };

export default function MarketsPage() {
  return (
    <div className="page">
      <header className="page-title">
        <span className="eyebrow">Live Kuru market</span>
        <h1>MON / USDC, right now.</h1>
        <p>Inspect the real price and available orders that your portfolio strategy uses.</p>
        <div className="route-note"><span>Monad chain 143</span><span>•</span><span>No wallet required</span><span>•</span><span>10-second refresh</span></div>
      </header>
      <div className="market-layout">
        <MarketPanel />
        <aside className="card panel">
          <span className="eyebrow">Price safety</span>
          <h2>The desk cross-checks every price.</h2>
          <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>Two independent Kuru readings must agree before the price can value your portfolio.</p>
          <div className="notice safe">A decimal or factor-of-ten mismatch stops the strategy instead of producing a wrong trade suggestion.</div>
          <div className="notice" style={{ marginTop: 12 }}>Depth shown here is the packed onchain L2 response. No chart history or volume metric is fabricated.</div>
        </aside>
      </div>
    </div>
  );
}
