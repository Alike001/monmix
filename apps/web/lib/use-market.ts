'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MarketSnapshotDto } from '@monad-strategy/kuru-adapter';

type MarketViewState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; snapshot: MarketSnapshotDto; receivedAt: number };

export function useMarket() {
  const [state, setState] = useState<MarketViewState>({ kind: 'loading' });

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/market', {
        cache: 'no-store',
        ...(signal ? { signal } : {}),
      });
      const payload = (await response.json()) as
        | { ok: true; snapshot: MarketSnapshotDto }
        | { ok: false; error: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? 'Market request failed' : payload.error);
      }
      setState({ kind: 'ready', snapshot: payload.snapshot, receivedAt: Date.now() });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'Market unavailable' });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const firstRead = window.setTimeout(() => void refresh(controller.signal), 0);
    const interval = window.setInterval(() => void refresh(), 10_000);
    return () => {
      controller.abort();
      window.clearTimeout(firstRead);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return { state, refresh: () => refresh() };
}
