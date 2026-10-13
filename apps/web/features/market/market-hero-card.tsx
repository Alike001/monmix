'use client';

import { useMarket } from '@/lib/use-market';
import { formatAge, formatPriceX18 } from '@/lib/format';

export function MarketHeroCard() {
  const { state } = useMarket();
  const ready = state.kind === 'ready';
  const snapshot = ready ? state.snapshot : null;
  return (
    <div className="card dark-card market-hero-card">
      <div className="market-card-top">
        <div className="market-pair">
          <div className="token-stack"><span className="token">MON</span><span className="token quote">$</span></div>
          <div><strong>MON / USDC</strong><div className="metric-label">Kuru spot</div></div>
        </div>
        <span className="status-chip"><span className={`status-dot ${snapshot?.status === 'LIVE' ? 'live' : 'stale'}`} />{snapshot?.status ?? (state.kind === 'error' ? 'UNAVAILABLE' : 'READING')}</span>
      </div>
      <div className="market-card-body">
        <span className="metric-label">Verified midpoint</span>
        <div className="big-price">{snapshot ? `$${formatPriceX18(snapshot.midpointX18)}` : '—'}</div>
        <div className="metric-label">Never cached as a fallback</div>
        <div className="metric-grid">
          <div className="metric"><span className="metric-label">Bid</span><strong>{snapshot ? formatPriceX18(snapshot.bestBidX18) : '—'}</strong></div>
          <div className="metric"><span className="metric-label">Ask</span><strong>{snapshot ? formatPriceX18(snapshot.bestAskX18) : '—'}</strong></div>
          <div className="metric"><span className="metric-label">Age</span><strong>{snapshot ? formatAge(snapshot.ageSeconds) : '—'}</strong></div>
        </div>
      </div>
    </div>
  );
}
