import type { MarketSnapshotDto } from '@monad-strategy/kuru-adapter';
import { formatRaw } from '@/lib/format';

function Side({
  label,
  side,
  levels,
  snapshot,
}: {
  label: string;
  side: 'bid' | 'ask';
  levels: Array<{ priceRaw: string; sizeRaw: string }>;
  snapshot: MarketSnapshotDto;
}) {
  const visible = levels.slice(0, 8);
  const maxSize = visible.reduce(
    (maximum, level) => (BigInt(level.sizeRaw) > maximum ? BigInt(level.sizeRaw) : maximum),
    1n,
  );
  return (
    <div className="depth-side">
      <h3>{label} · price / MON</h3>
      {visible.length === 0 ? (
        <div className="depth-row"><span>No levels</span><span>—</span></div>
      ) : (
        visible.map((level) => {
          const width = Number((BigInt(level.sizeRaw) * 100n) / maxSize);
          return (
            <div
              className={`depth-row ${side}`}
              key={`${side}-${level.priceRaw}`}
              style={{ '--depth': `${Math.max(width, 2)}%` } as React.CSSProperties}
            >
              <span>{formatRaw(level.priceRaw, snapshot.params.pricePrecision, 6)}</span>
              <span>{formatRaw(level.sizeRaw, snapshot.params.sizePrecision, 3)}</span>
            </div>
          );
        })
      )}
    </div>
  );
}

export function DepthTable({ snapshot }: { snapshot: MarketSnapshotDto }) {
  return (
    <div className="depth-grid">
      <Side label="Bids" side="bid" levels={snapshot.book.bids} snapshot={snapshot} />
      <Side label="Asks" side="ask" levels={snapshot.book.asks} snapshot={snapshot} />
    </div>
  );
}
