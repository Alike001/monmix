'use client';

import { KURU_MON_USDC_MARKET, MONAD_EXPLORER_URL } from '@monad-strategy/kuru-adapter';
import { AvailabilityState } from '@/components/availability-state';
import { formatAge, formatPriceX18, formatRaw } from '@/lib/format';
import { useMarket } from '@/lib/use-market';
import { DepthTable } from './depth-table';

export function MarketPanel({ compact = false }: { compact?: boolean }) {
  const { state, refresh } = useMarket();
  if (state.kind === 'loading') {
    return (
      <section className="card panel">
        <span className="eyebrow">Live contract read</span>
        <div className="skeleton wide" /><div className="skeleton" />
      </section>
    );
  }
  if (state.kind === 'error') {
    return (
      <AvailabilityState
        eyebrow="Kuru read unavailable"
        title="No market data is being substituted."
        detail={state.message}
        action={<button className="button small" type="button" onClick={() => void refresh()}>Retry</button>}
      />
    );
  }

  const { snapshot } = state;
  const spread = BigInt(snapshot.bestAskX18) - BigInt(snapshot.bestBidX18);
  const spreadBps = BigInt(snapshot.midpointX18) > 0n
    ? (spread * 10_000n) / BigInt(snapshot.midpointX18)
    : 0n;

  return (
    <section className="card panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Kuru · Monad mainnet</span>
          <h2>MON / USDC</h2>
          <p>Order book block {snapshot.book.blockNumber}</p>
        </div>
        <span className="status-chip">
          <span className={`status-dot ${snapshot.status === 'LIVE' ? 'live' : 'stale'}`} />
          {snapshot.status} · {formatAge(snapshot.ageSeconds)} old
        </span>
      </div>
      <div className="quote-row">
        <div className="quote-box"><span className="metric-label">Best bid</span><strong>${formatPriceX18(snapshot.bestBidX18)}</strong></div>
        <div className="quote-box"><span className="metric-label">Midpoint</span><strong>${formatPriceX18(snapshot.midpointX18)}</strong></div>
        <div className="quote-box"><span className="metric-label">Best ask / spread</span><strong>${formatPriceX18(snapshot.bestAskX18)} · {spreadBps} bps</strong></div>
      </div>
      {snapshot.status === 'EMPTY' ? (
        <div className="notice danger">The verified market returned zero two-sided liquidity. Reviews are blocked.</div>
      ) : snapshot.status === 'STALE' ? (
        <div className="notice danger">This order-book block is stale. Strategy reviews are blocked until a fresh read succeeds.</div>
      ) : null}
      {!compact ? <DepthTable snapshot={snapshot} /> : null}
      {!compact ? (
        <div className="evidence-list" style={{ marginTop: 22 }}>
          <div className="evidence-row"><span>Market</span><strong>{KURU_MON_USDC_MARKET}</strong></div>
          <div className="evidence-row"><span>Price precision</span><strong>{snapshot.params.pricePrecision} (packed L2)</strong></div>
          <div className="evidence-row"><span>BBO scale</span><strong>1e18, cross-checked against packed L2</strong></div>
          <div className="evidence-row"><span>Minimum size</span><strong>{formatRaw(snapshot.params.minSize, snapshot.params.sizePrecision, 4)} MON</strong></div>
          <div className="evidence-row"><span>Explorer</span><strong><a href={`${MONAD_EXPLORER_URL}/address/${KURU_MON_USDC_MARKET}`} target="_blank" rel="noreferrer">Inspect deployed bytecode ↗</a></strong></div>
        </div>
      ) : null}
    </section>
  );
}
