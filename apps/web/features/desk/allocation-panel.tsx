'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConnection, useSwitchChain } from 'wagmi';
import {
  buildReadOnlyReview,
  deserializeMarketSnapshot,
  MONAD_MAINNET_CHAIN_ID,
  quoteAtomsForBaseAtoms,
} from '@monad-strategy/kuru-adapter';
import {
  evaluateRebalance,
  formatAtoms,
  parseDecimalToAtoms,
  type ProposedAction,
} from '@monad-strategy/domain';
import { ConnectWallet } from '@/features/wallet/connect-wallet';
import { formatCompactAtoms, formatRaw } from '@/lib/format';
import { useMarket } from '@/lib/use-market';
import { getWalletReadiness } from '@/lib/wallet-state';
import { NativeSellPreflight } from '@/features/execution/native-sell-preflight';
import { readStrategyPreferences, saveStrategyPreferences } from '@/lib/strategy-preferences';

type BalanceState =
  | { kind: 'idle' }
  | { kind: 'error'; owner: string; message: string }
  | { kind: 'ready'; owner: string; mon: bigint; usdc: bigint };

type StrategyResult =
  | { kind: 'blocked'; title: string; detail: string; code: string }
  | {
      kind: 'decision';
      decision: ProposedAction;
      baseValueQuoteAtoms: bigint;
      cashQuoteAtoms: bigint;
      allocationBps: bigint;
      review: ReturnType<typeof buildReadOnlyReview> | null;
      snapshot: ReturnType<typeof deserializeMarketSnapshot>;
    };

export function AllocationPanel() {
  const connection = useConnection();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { state: marketState } = useMarket();
  const readiness = getWalletReadiness(connection.status, connection.chainId, MONAD_MAINNET_CHAIN_ID);
  const [balances, setBalances] = useState<BalanceState>({ kind: 'idle' });
  const [target, setTarget] = useState('60');
  const [trigger, setTrigger] = useState('5');
  const [perActionCap, setPerActionCap] = useState('15');
  const [dailyCap, setDailyCap] = useState('25');
  const [minimumTrade, setMinimumTrade] = useState('5');
  const [paused, setPaused] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readStrategyPreferences(window.localStorage);
      setTarget(saved.target);
      setTrigger(saved.trigger);
      setPerActionCap(saved.perActionCap);
      setDailyCap(saved.dailyCap);
      setMinimumTrade(saved.minimumTrade);
      setPaused(saved.paused);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (readiness !== 'READY' || !connection.address) {
      return;
    }
    const controller = new AbortController();
    const owner = connection.address;
    const loadBalances = () => fetch(`/api/balances?address=${owner}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as
          | { ok: true; mon: string; usdc: string }
          | { ok: false; error: string };
        if (!response.ok || !payload.ok) throw new Error(payload.ok ? 'Balance read failed' : payload.error);
        setBalances({ kind: 'ready', owner, mon: BigInt(payload.mon), usdc: BigInt(payload.usdc) });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setBalances({ kind: 'error', owner, message: error instanceof Error ? error.message : 'Balance read failed' });
      });
    void loadBalances();
    window.addEventListener('strategy-desk:balances-stale', loadBalances);
    return () => {
      controller.abort();
      window.removeEventListener('strategy-desk:balances-stale', loadBalances);
    };
  }, [connection.address, readiness]);

  const result = useMemo<StrategyResult>(() => {
    if (readiness === 'DISCONNECTED') {
      return { kind: 'blocked', code: 'DISCONNECTED', title: 'Connect to evaluate your holdings.', detail: 'The public market is live, but portfolio balances require a wallet address.' };
    }
    if (readiness === 'WRONG_NETWORK') {
      return { kind: 'blocked', code: 'WRONG_NETWORK', title: 'Monad mainnet is required.', detail: 'No balances or recommendations are accepted from another chain.' };
    }
    const balancesMatch =
      (balances.kind === 'ready' || balances.kind === 'error') &&
      balances.owner === connection.address;
    if (marketState.kind === 'loading' || balances.kind === 'idle' || !balancesMatch) {
      return { kind: 'blocked', code: 'READING', title: 'Reading market and balances.', detail: 'The desk will not evaluate partial data.' };
    }
    if (marketState.kind === 'error') {
      return { kind: 'blocked', code: 'MARKET_UNAVAILABLE', title: 'Market read failed.', detail: marketState.message };
    }
    if (balances.kind === 'error') {
      return { kind: 'blocked', code: 'BALANCE_UNAVAILABLE', title: 'Balance read failed.', detail: balances.message };
    }
    if (balances.kind !== 'ready') {
      return { kind: 'blocked', code: 'READING', title: 'Reading wallet balances.', detail: 'The desk will not evaluate partial data.' };
    }

    try {
      const snapshot = deserializeMarketSnapshot(marketState.snapshot);
      if (snapshot.status !== 'LIVE') {
        return { kind: 'blocked', code: snapshot.status, title: 'Fresh two-sided liquidity is required.', detail: 'The strategy cannot value or review against a stale or empty book.' };
      }
      const baseValueQuoteAtoms = quoteAtomsForBaseAtoms(balances.mon, snapshot.midpointX18);
      const cashQuoteAtoms = balances.usdc;
      const total = baseValueQuoteAtoms + cashQuoteAtoms;
      const allocationBps = total === 0n ? 0n : (baseValueQuoteAtoms * 10_000n) / total;
      const decision = evaluateRebalance({
        baseValueQuoteAtoms,
        cashQuoteAtoms,
        targetBaseBps: parseDecimalToAtoms(target, 2),
        triggerDriftBps: parseDecimalToAtoms(trigger, 2),
        perActionCapQuoteAtoms: parseDecimalToAtoms(perActionCap, 6),
        dailyCapQuoteAtoms: parseDecimalToAtoms(dailyCap, 6),
        usedTodayQuoteAtoms: 0n,
        minimumTradeQuoteAtoms: parseDecimalToAtoms(minimumTrade, 6),
        nowSeconds: snapshot.observedAtSeconds + snapshot.ageSeconds,
        lastPriceUpdateSeconds: snapshot.observedAtSeconds,
        maxPriceAgeSeconds: 30n,
        paused,
      });
      const review = decision.status === 'REVIEW'
        ? buildReadOnlyReview(snapshot, decision.side, decision.quoteNotional)
        : null;
      return { kind: 'decision', decision, baseValueQuoteAtoms, cashQuoteAtoms, allocationBps, review, snapshot };
    } catch (error) {
      return { kind: 'blocked', code: 'INVALID_INPUT', title: 'Check the strategy fields.', detail: error instanceof Error ? error.message : 'Invalid policy input' };
    }
  }, [balances, connection.address, dailyCap, marketState, minimumTrade, paused, perActionCap, readiness, target, trigger]);

  const liveBalances = balances.kind === 'ready' && balances.owner === connection.address ? balances : null;
  return (
    <div className="desk-layout">
      <div style={{ display: 'grid', gap: 18 }}>
        <section className="card panel">
          <div className="panel-head">
            <div><span className="eyebrow">Wallet inventory</span><h2>Your spot portfolio</h2><p>Direct Monad native and USDC balance reads.</p></div>
            <ConnectWallet />
          </div>
          {readiness === 'WRONG_NETWORK' ? (
            <div className="notice danger">Connected to chain {connection.chainId}. <button className="text-button" disabled={isSwitching} onClick={() => switchChain({ chainId: 143 })}>{isSwitching ? 'Switching…' : 'Switch to Monad mainnet'}</button></div>
          ) : null}
          <div className="balance-grid">
            <div className="balance"><span className="metric-label">Native MON</span><strong>{liveBalances ? formatCompactAtoms(liveBalances.mon, 18, 4) : '—'}</strong></div>
            <div className="balance"><span className="metric-label">USDC</span><strong>{liveBalances ? `$${formatCompactAtoms(liveBalances.usdc, 6, 2)}` : '—'}</strong></div>
          </div>
          {result.kind === 'decision' ? (
            <>
              <div className="allocation-bar" aria-label={`Current MON allocation ${Number(result.allocationBps) / 100}%`}><span style={{ width: `${Number(result.allocationBps) / 100}%` }} /><span style={{ flex: 1 }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: 12 }}><span>MON {formatAtoms(result.allocationBps, 2, 2)}%</span><span>USDC {formatAtoms(10_000n - result.allocationBps, 2, 2)}%</span></div>
            </>
          ) : null}
        </section>

        <section className="card panel">
          <div className="panel-head"><div><span className="eyebrow">Advisory policy</span><h2>Choose the shape of the portfolio.</h2><p>These rules produce a review. They do not enforce or execute a trade.</p></div></div>
          <div className="form-grid">
            <Field label="Target held as MON" value={target} onChange={setTarget} suffix="%" />
            <Field label="Review when drift exceeds" value={trigger} onChange={setTrigger} suffix="%" />
            <Field label="Maximum one review" value={perActionCap} onChange={setPerActionCap} suffix="USDC" />
            <Field label="Advisory daily budget" value={dailyCap} onChange={setDailyCap} suffix="USDC" />
            <Field label="Ignore adjustments below" value={minimumTrade} onChange={setMinimumTrade} suffix="USDC" />
            <div className="toggle-row"><div><strong>Pause strategy</strong><div className="metric-label">Local review control</div></div><button type="button" aria-pressed={paused} aria-label="Pause strategy" className={`toggle ${paused ? 'on' : ''}`} onClick={() => setPaused((value) => !value)} /></div>
          </div>
          <div className="preference-actions"><button className="button small secondary" type="button" onClick={() => {
            saveStrategyPreferences(window.localStorage, { target, trigger, perActionCap, dailyCap, minimumTrade, paused });
            setSavedMessage('Saved in this browser only.');
          }}>Save these preferences</button><span>{savedMessage || 'Not synced onchain or across devices.'}</span></div>
          <div className="notice" style={{ marginTop: 18 }}>Daily usage is currently evaluated as zero; the local journal is evidence, not an independently enforced spending ledger. Every saved setting is an advisory browser preference, not a contract-enforced limit.</div>
        </section>
      </div>

      <DecisionCard result={result} />
      {result.kind === 'decision' && result.decision.status === 'REVIEW' &&
      result.decision.side === 'SELL_BASE' && result.review?.status === 'REVIEW' && connection.address ? (
        <NativeSellPreflight account={connection.address} baseAmountAtoms={result.review.estimatedBaseAtoms} />
      ) : null}
    </div>
  );
}

function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix: string }) {
  const id = `strategy-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`;
  return <div className="field"><label htmlFor={id}>{label}</label><div className="input-wrap"><input id={id} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} /><span>{suffix}</span></div></div>;
}

function DecisionCard({ result }: { result: StrategyResult }) {
  if (result.kind === 'blocked') {
    return (
      <aside className="card panel decision">
        <div className="decision-status"><span className="eyebrow">Deterministic output</span><span className="decision-code">BLOCK</span></div>
        <h2>{result.title}</h2><p>{result.detail}</p>
        <div className="review-metrics"><div className="review-metric"><span>Reason code</span><strong>{result.code}</strong></div><div className="review-metric"><span>Transaction capability</span><strong>Disabled</strong></div></div>
        <div className="notice danger">No transaction can proceed in this state. The native sell lifecycle also remains disabled by default pending explicit owner approval.</div>
      </aside>
    );
  }
  const { decision, review, snapshot } = result;
  const headline = decision.status === 'WAIT' ? 'No adjustment is needed.' : decision.status === 'BLOCK' ? 'The policy refuses this adjustment.' : `${decision.side === 'BUY_BASE' ? 'Buy' : 'Sell'} MON for review.`;
  return (
    <aside className="card panel decision">
      <div className="decision-status"><span className="eyebrow">Deterministic output</span><span className="decision-code">{decision.status}</span></div>
      <h2>{headline}</h2>
      <p>{decision.status === 'REVIEW' ? decision.reason : `Policy result: ${decision.code}.`}</p>
      <div className="review-metrics">
        <div className="review-metric"><span>Current MON value</span><strong>${formatCompactAtoms(result.baseValueQuoteAtoms, 6, 2)}</strong></div>
        <div className="review-metric"><span>Current USDC</span><strong>${formatCompactAtoms(result.cashQuoteAtoms, 6, 2)}</strong></div>
        <div className="review-metric"><span>Allocation drift</span><strong>{formatAtoms(decision.driftBps, 2, 2)}%</strong></div>
        {decision.status === 'REVIEW' ? <div className="review-metric"><span>Bounded notional</span><strong>${formatCompactAtoms(decision.quoteNotional, 6, 2)}</strong></div> : null}
        {review?.status === 'REVIEW' ? <><div className="review-metric"><span>Estimated MON</span><strong>{formatCompactAtoms(review.estimatedBaseAtoms, 18, 4)}</strong></div><div className="review-metric"><span>Worst visible price</span><strong>${formatRaw(review.worstPriceRaw, snapshot.params.pricePrecision, 6)}</strong></div><div className="review-metric"><span>Book levels used</span><strong>{review.levelsUsed}</strong></div></> : null}
        {review?.status === 'BLOCK' ? <div className="review-metric"><span>Venue review</span><strong>BLOCK · {review.code}</strong></div> : null}
      </div>
      {review?.status === 'BLOCK' && review.code === 'BELOW_MARKET_MINIMUM' ? <div className="notice danger">This adjustment is smaller than Kuru’s declared 200 MON market minimum. Strategy Desk will not prepare it, even though the deployed market-sell function does not enforce that limit itself. Wait for more drift or revise the target and advisory cap.</div> : null}
      <div className="notice safe">Policy review only. A separate exact simulation is offered only for eligible native MON sells. Nothing is signed or broadcast unless the owner later enables execution and confirms in an injected wallet.</div>
    </aside>
  );
}
