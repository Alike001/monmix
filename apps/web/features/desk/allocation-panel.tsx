'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { buildReadOnlyReview, deserializeMarketSnapshot, MONAD_MAINNET_CHAIN_ID, quoteAtomsForBaseAtoms } from '@monad-strategy/kuru-adapter';
import { evaluateRebalance, formatAtoms, parseDecimalToAtoms, type ProposedAction } from '@monad-strategy/domain';
import { useVerifiedWallet } from '@/features/wallet/wallet-readiness-provider';
import { NativeSellPreflight } from '@/features/execution/native-sell-preflight';
import { NativeBuyPreflight } from '@/features/execution/native-buy-preflight';
import { ALLOCATION_PRESETS, allocationBps, marketMinimumQuoteAtoms, presetForTarget } from '@/lib/allocation';
import { formatCompactAtoms, formatRaw } from '@/lib/format';
import { DEFAULT_STRATEGY_PREFERENCES, readStrategyPreferences, saveStrategyPreferences, type StrategyPresetId } from '@/lib/strategy-preferences';
import { useMarket } from '@/lib/use-market';

type BalanceState = { kind: 'idle' } | { kind: 'error'; owner: string; message: string } | { kind: 'ready'; owner: string; mon: bigint; usdc: bigint; observedAtSeconds: bigint };
type Snapshot = ReturnType<typeof deserializeMarketSnapshot>;
type StrategyResult =
  | { kind: 'blocked'; title: string; detail: string; code: string }
  | { kind: 'decision'; decision: ProposedAction; baseValueQuoteAtoms: bigint; cashQuoteAtoms: bigint; allocationBps: bigint; minimumBaseAtoms: bigint; minimumQuoteAtoms: bigint; review: ReturnType<typeof buildReadOnlyReview> | null; snapshot: Snapshot; walletObservedAtSeconds: bigint };

export function AllocationPanel() {
  const wallet = useVerifiedWallet();
  const { state: marketState } = useMarket();
  const readiness = wallet.readiness;
  const [balances, setBalances] = useState<BalanceState>({ kind: 'idle' });
  const [preset, setPreset] = useState<StrategyPresetId>(DEFAULT_STRATEGY_PREFERENCES.preset);
  const [target, setTarget] = useState(DEFAULT_STRATEGY_PREFERENCES.target);
  const [trigger, setTrigger] = useState(DEFAULT_STRATEGY_PREFERENCES.trigger);
  const [perActionCap, setPerActionCap] = useState(DEFAULT_STRATEGY_PREFERENCES.perActionCap);
  const [dailyCap, setDailyCap] = useState(DEFAULT_STRATEGY_PREFERENCES.dailyCap);
  const [minimumTrade, setMinimumTrade] = useState(DEFAULT_STRATEGY_PREFERENCES.minimumTrade);
  const [paused, setPaused] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readStrategyPreferences(window.localStorage);
      setPreset(saved.preset); setTarget(saved.target); setTrigger(saved.trigger); setPerActionCap(saved.perActionCap);
      setDailyCap(saved.dailyCap); setMinimumTrade(saved.minimumTrade); setPaused(saved.paused); setPreferencesLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (readiness !== 'READY' || !wallet.address) {
      const timer = window.setTimeout(() => setBalances({ kind: 'idle' }), 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    const owner = wallet.address;
    const loadingTimer = window.setTimeout(() => setBalances({ kind: 'idle' }), 0);
    const loadBalances = () => fetch(`/api/balances?address=${owner}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as { ok: true; mon: string; usdc: string } | { ok: false; error: string };
        if (!response.ok || !payload.ok) throw new Error(payload.ok ? 'Balance read failed' : payload.error);
        setBalances({ kind: 'ready', owner, mon: BigInt(payload.mon), usdc: BigInt(payload.usdc), observedAtSeconds: BigInt(Math.floor(Date.now() / 1000)) });
      }).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setBalances({ kind: 'error', owner, message: error instanceof Error ? error.message : 'Balance read failed' });
      });
    void loadBalances();
    window.addEventListener('strategy-desk:balances-stale', loadBalances);
    return () => { window.clearTimeout(loadingTimer); controller.abort(); window.removeEventListener('strategy-desk:balances-stale', loadBalances); };
  }, [readiness, wallet.address]);

  const result = useMemo<StrategyResult>(() => {
    if (readiness === 'DISCONNECTED') return { kind: 'blocked', code: 'DISCONNECTED', title: 'Connect your wallet to see your plan.', detail: 'Market data is public. Reading your portfolio needs only a public wallet address—no signature.' };
    if (readiness === 'VERIFYING') return { kind: 'blocked', code: 'VERIFYING', title: 'Checking the selected wallet.', detail: 'MonMix is verifying the provider account and network before reading Monad balances.' };
    if (readiness === 'WRONG_NETWORK') return { kind: 'blocked', code: 'WRONG_NETWORK', title: 'Switch to Monad mainnet.', detail: 'The desk will not mix balances from another network with this Kuru market.' };
    if (readiness === 'PROVIDER_MISMATCH') return { kind: 'blocked', code: 'PROVIDER_MISMATCH', title: 'Reconnect the selected wallet.', detail: wallet.message ?? 'The provider account or network does not match the connected wallet state.' };
    const balancesMatch = (balances.kind === 'ready' || balances.kind === 'error') && balances.owner === wallet.address;
    if (marketState.kind === 'loading' || balances.kind === 'idle' || !balancesMatch) return { kind: 'blocked', code: 'READING', title: 'Reading your portfolio.', detail: 'A recommendation appears only after balances and live market data arrive.' };
    if (marketState.kind === 'error') return { kind: 'blocked', code: 'MARKET_UNAVAILABLE', title: 'The live market is unavailable.', detail: marketState.message };
    if (balances.kind === 'error') return { kind: 'blocked', code: 'BALANCE_UNAVAILABLE', title: 'Your balances could not be read.', detail: balances.message };
    if (balances.kind !== 'ready') return { kind: 'blocked', code: 'READING', title: 'Reading your portfolio.', detail: 'The desk will not evaluate partial data.' };
    try {
      const snapshot = deserializeMarketSnapshot(marketState.snapshot);
      if (snapshot.status !== 'LIVE') return { kind: 'blocked', code: snapshot.status, title: 'A fresh market is required.', detail: 'The recommendation stops when the order book is stale or has no two-sided liquidity.' };
      const baseValueQuoteAtoms = quoteAtomsForBaseAtoms(balances.mon, snapshot.midpointX18);
      const cashQuoteAtoms = balances.usdc;
      const currentAllocationBps = allocationBps(baseValueQuoteAtoms, cashQuoteAtoms);
      const minimumBaseAtoms = (snapshot.params.minSize * 10n ** snapshot.params.baseAssetDecimals) / snapshot.params.sizePrecision;
      const minimumQuoteAtoms = marketMinimumQuoteAtoms(minimumBaseAtoms, snapshot.midpointX18);
      const decision = evaluateRebalance({
        baseValueQuoteAtoms, cashQuoteAtoms, targetBaseBps: parseDecimalToAtoms(target, 2), triggerDriftBps: parseDecimalToAtoms(trigger, 2),
        perActionCapQuoteAtoms: parseDecimalToAtoms(perActionCap, 6), dailyCapQuoteAtoms: parseDecimalToAtoms(dailyCap, 6), usedTodayQuoteAtoms: 0n,
        minimumTradeQuoteAtoms: parseDecimalToAtoms(minimumTrade, 6), nowSeconds: snapshot.observedAtSeconds + snapshot.ageSeconds,
        lastPriceUpdateSeconds: snapshot.observedAtSeconds, maxPriceAgeSeconds: 30n, paused,
      });
      const review = decision.status === 'REVIEW' ? buildReadOnlyReview(snapshot, decision.side, decision.quoteNotional) : null;
      return { kind: 'decision', decision, baseValueQuoteAtoms, cashQuoteAtoms, allocationBps: currentAllocationBps, minimumBaseAtoms, minimumQuoteAtoms, review, snapshot, walletObservedAtSeconds: balances.observedAtSeconds };
    } catch (error) {
      return { kind: 'blocked', code: 'INVALID_INPUT', title: 'Check these strategy settings.', detail: error instanceof Error ? error.message : 'A setting could not be read.' };
    }
  }, [balances, dailyCap, marketState, minimumTrade, paused, perActionCap, readiness, target, trigger, wallet.address, wallet.message]);

  const liveBalances = readiness === 'READY' && balances.kind === 'ready' && balances.owner === wallet.address ? balances : null;
  const changeTarget = (value: string) => { setTarget(value); setPreset(presetForTarget(value)); setSavedMessage(''); };
  return <div className="desk-workspace">
    <div className="desk-steps" aria-label="Strategy workflow"><span className="active">1 Portfolio</span><span>2 Target</span><span>3 Decision</span><span>4 Preview</span></div>
    <div className="desk-layout"><div className="desk-main-column">
      <section className="card panel portfolio-panel">
        <div className="panel-head"><div><span className="eyebrow">Your portfolio</span><h2>MON and USDC, valued now</h2><p>Connect and manage your wallet from the header. Balances appear here only after the selected wallet is verified on Monad mainnet.</p></div></div>
        {readiness === 'WRONG_NETWORK' ? <div className="notice danger"><strong>Wrong network.</strong> Monad balances are hidden until the selected wallet switches to chain {MONAD_MAINNET_CHAIN_ID}.</div> : null}
        {readiness === 'PROVIDER_MISMATCH' ? <div className="notice danger"><strong>Wallet state mismatch.</strong> Monad balances and trade preparations have been cleared. Disconnect and reconnect the wallet you intend to use.</div> : null}
        <div className="portfolio-summary"><AllocationRing allocation={result.kind === 'decision' ? result.allocationBps : null} total={result.kind === 'decision' ? result.baseValueQuoteAtoms + result.cashQuoteAtoms : null} /><div className="balance-grid">
          <div className="balance"><span className="token-label"><i className="token-dot mon" />MON</span><strong>{liveBalances ? formatCompactAtoms(liveBalances.mon, 18, 4) : '—'}</strong><small>{result.kind === 'decision' ? `$${formatCompactAtoms(result.baseValueQuoteAtoms, 6, 2)} value` : 'Native balance'}</small></div>
          <div className="balance"><span className="token-label"><i className="token-dot usdc" />USDC</span><strong>{liveBalances ? formatCompactAtoms(liveBalances.usdc, 6, 2) : '—'}</strong><small>Stable-value balance</small></div>
        </div></div>
        {result.kind === 'decision' ? <AllocationComparison current={result.allocationBps} target={parseDecimalToAtoms(target, 2)} /> : null}
      </section>
      <section className="card panel target-panel">
        <div className="panel-head"><div><span className="eyebrow">Your target</span><h2>Choose the mix you want to maintain</h2><p>A saved target is a browser preference, not an automatic trade or onchain limit.</p></div></div>
        <fieldset className="strategy-controls" disabled={!preferencesLoaded} aria-busy={!preferencesLoaded}>
        <div className="preset-grid" role="radiogroup" aria-label="Allocation presets">
          {ALLOCATION_PRESETS.map((item) => <button key={item.id} type="button" role="radio" aria-checked={preset === item.id} className={`preset-card ${preset === item.id ? 'selected' : ''}`} onClick={() => { setPreset(item.id); setTarget(item.monPercent); setSavedMessage(''); }}><strong>{item.name}</strong><span>{item.monPercent}% MON · {100 - Number(item.monPercent)}% USDC</span><small>{item.description}</small></button>)}
          <button type="button" role="radio" aria-checked={preset === 'custom'} className={`preset-card ${preset === 'custom' ? 'selected' : ''}`} onClick={() => setPreset('custom')}><strong>Custom</strong><span>Your exact mix</span><small>Adjust the slider below.</small></button>
        </div>
        <div className="target-control"><div className="target-numbers"><strong>{target || '0'}% MON</strong><span>{Math.max(0, 100 - Number(target || 0))}% USDC</span></div><input aria-label="Target MON percentage" type="range" min="0" max="100" step="1" value={target} onChange={(event) => changeTarget(event.target.value)} /><div className="target-scale"><span>All USDC</span><span>Balanced</span><span>All MON</span></div></div>
        <details className="advanced-settings"><summary>Review limits and advanced settings</summary><div className="form-grid"><Field label="Act when allocation differs by" value={trigger} onChange={setTrigger} suffix="%" /><Field label="Maximum size per suggestion" value={perActionCap} onChange={setPerActionCap} suffix="USDC" /><Field label="Advisory daily maximum" value={dailyCap} onChange={setDailyCap} suffix="USDC" /><Field label="Ignore adjustments below" value={minimumTrade} onChange={setMinimumTrade} suffix="USDC" /><div className="toggle-row"><div><strong>Pause suggestions</strong><div className="metric-label">Stored in this browser</div></div><button type="button" aria-pressed={paused} aria-label="Pause strategy" className={`toggle ${paused ? 'on' : ''}`} onClick={() => setPaused((value) => !value)} /></div></div></details>
        <div className="preference-actions"><button className="button small secondary" type="button" onClick={() => { saveStrategyPreferences(window.localStorage, { preset, target, trigger, perActionCap, dailyCap, minimumTrade, paused }); setSavedMessage('Saved in this browser.'); }}>Save strategy</button><span aria-live="polite">{savedMessage || 'Nothing is synced onchain or between devices.'}</span></div>
        </fieldset>
      </section>
    </div><DecisionCard result={result} target={target} minimumTrade={minimumTrade} /></div>
    {result.kind === 'decision' && result.decision.status === 'REVIEW' && result.review?.status === 'REVIEW' && wallet.address ? result.decision.side === 'SELL_BASE'
      ? <NativeSellPreflight key={`sell:${wallet.connectorUid}:${wallet.address}:${result.review.estimatedBaseAtoms}`} account={wallet.address} baseAmountAtoms={result.review.estimatedBaseAtoms} />
      : <NativeBuyPreflight key={`buy:${wallet.connectorUid}:${wallet.address}:${result.review.estimatedQuoteAtoms}`} account={wallet.address} quoteAmountAtoms={result.review.estimatedQuoteAtoms} /> : null}
  </div>;
}

function AllocationRing({ allocation, total }: { allocation: bigint | null; total: bigint | null }) {
  const percent = allocation === null ? 0 : Number(allocation) / 100;
  return <div className="allocation-figure"><div className="allocation-ring" role="img" aria-label={allocation === null ? 'Portfolio allocation unavailable' : `Current portfolio is ${percent}% MON and ${100 - percent}% USDC`} style={{ '--allocation': `${percent * 3.6}deg` } as CSSProperties}><div><strong>{allocation === null ? '—' : `${formatAtoms(allocation, 2, 1)}%`}</strong><span>MON now</span></div></div><p><span>Total portfolio value</span><strong>{total === null ? '—' : `$${formatCompactAtoms(total, 6, 2)}`}</strong></p></div>;
}

function AllocationComparison({ current, target }: { current: bigint; target: bigint }) {
  const currentPercent = Number(current) / 100; const targetPercent = Number(target) / 100;
  return <div className="allocation-comparison"><div className="comparison-labels"><strong>Current {formatAtoms(current, 2, 1)}%</strong><span>Target {formatAtoms(target, 2, 1)}%</span></div><div className="comparison-track" role="img" aria-label={`Current MON ${currentPercent}%, target MON ${targetPercent}%`}><span style={{ width: `${currentPercent}%` }} /><i style={{ left: `${targetPercent}%` }} /></div><div className="allocation-legend"><span><i className="current" />Current MON</span><span><i className="target" />Target marker</span></div></div>;
}

function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix: string }) {
  const id = `strategy-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`;
  return <div className="field"><label htmlFor={id}>{label}</label><div className="input-wrap"><input id={id} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} /><span>{suffix}</span></div></div>;
}

function decisionExplanation(decision: ProposedAction): string {
  if (decision.status === 'WAIT' && decision.code === 'NO_CAPITAL') return 'No MON or USDC was found at this address on Monad. Add funds before MonMix can evaluate an allocation or prepare a trade.';
  if (decision.status === 'WAIT') return 'Your MON share is close enough to your target. No adjustment is useful yet.';
  if (decision.status === 'BLOCK') {
    if (decision.code === 'PAUSED') return 'Suggestions are paused in your browser settings.';
    if (decision.code === 'BELOW_MINIMUM') return 'The adjustment is below the minimum you chose in advanced settings.';
    return `The strategy stopped this adjustment (${decision.code.replaceAll('_', ' ').toLowerCase()}).`;
  }
  return decision.side === 'SELL_BASE' ? 'You hold more MON than your target. A bounded MON sell would move the portfolio closer.' : 'You hold less MON than your target. A protected USDC-to-MON buy would move the portfolio closer.';
}

function DecisionCard({ result, target, minimumTrade }: { result: StrategyResult; target: string; minimumTrade: string }) {
  if (result.kind === 'blocked') return <aside className="card panel decision"><div className="decision-status"><span className="eyebrow">Your next step</span><span className="decision-code block">BLOCK</span></div><h2>{result.title}</h2><p>{result.detail}</p><div className="decision-next">No transaction can be prepared in this state.</div></aside>;
  const { decision, review, snapshot } = result;
  const noCapital = decision.status === 'WAIT' && decision.code === 'NO_CAPITAL';
  const reviewSide = decision.status === 'REVIEW' ? decision.side : null;
  const headline = decision.status === 'WAIT'
    ? noCapital ? 'This portfolio is empty.' : 'Your allocation is on track.'
    : decision.status === 'BLOCK' ? 'This adjustment is not available.' : decision.side === 'BUY_BASE' ? 'A MON buy is suggested.' : 'A MON sell is ready to inspect.';
  return <aside className="card panel decision"><div className="decision-status"><span className="eyebrow">Your next step</span><span className={`decision-code ${decision.status.toLowerCase()}`}>{decision.status}</span></div><h2>{headline}</h2><p>{decisionExplanation(decision)}</p><div className="decision-allocation"><span>Current MON <strong>{formatAtoms(result.allocationBps, 2, 1)}%</strong></span><b>→</b><span>Target MON <strong>{target}%</strong></span></div>
    <div className="strategy-health" aria-label="Strategy health"><div><span>Current allocation</span><strong>{noCapital ? 'No assets' : `${formatAtoms(result.allocationBps, 2, 1)}% MON`}</strong></div><div><span>Desired allocation</span><strong>{target}% MON</strong></div><div><span>Wallet observed</span><strong>{Math.max(0, Number(result.snapshot.observedAtSeconds + result.snapshot.ageSeconds - result.walletObservedAtSeconds))}s ago</strong></div><div><span>Market observed</span><strong>{result.snapshot.ageSeconds}s old</strong></div><div><span>Adjustment health</span><strong>{review?.status === 'REVIEW' ? 'Meets visible market rules' : decision.status === 'WAIT' ? noCapital ? 'Fund wallet to begin' : 'No adjustment needed' : 'Unavailable now'}</strong></div></div>
    <div className="review-metrics"><div className="review-metric"><span>Difference from target</span><strong>{formatAtoms(decision.driftBps < 0n ? -decision.driftBps : decision.driftBps, 2, 2)}%</strong></div>{decision.status === 'REVIEW' ? <div className="review-metric"><span>{reviewSide === 'BUY_BASE' ? 'USDC to spend' : 'Proposed trade value'}</span><strong>${formatCompactAtoms(decision.quoteNotional, 6, 2)}</strong></div> : null}{review?.status === 'REVIEW' ? <><div className="review-metric important"><span>{reviewSide === 'BUY_BASE' ? 'Estimated MON received' : 'Proposed MON amount'}</span><strong>{formatCompactAtoms(review.estimatedBaseAtoms, 18, 4)} MON</strong></div><div className="review-metric"><span>Worst visible price</span><strong>${formatRaw(review.worstPriceRaw, snapshot.params.pricePrecision, 6)}</strong></div><div className="review-metric"><span>Order-book levels used</span><strong>{review.levelsUsed}</strong></div></> : null}</div>
    <div className="market-requirement"><span>Kuru minimum order</span><strong>{formatCompactAtoms(result.minimumBaseAtoms, 18, 0)} MON</strong><small>About ${formatCompactAtoms(result.minimumQuoteAtoms, 6, 2)} at the current midpoint</small></div>
    {parseDecimalToAtoms(minimumTrade, 6) > result.minimumQuoteAtoms ? <div className="notice">Your “ignore below” setting (${minimumTrade}) is above Kuru’s current minimum value. It may refuse a valid 200 MON order. Lower it to let the venue minimum decide.</div> : null}
    {review?.status === 'BLOCK' && review.code === 'BELOW_MARKET_MINIMUM' ? <div className="notice danger"><strong>Too small for Kuru.</strong><br />This proposal is below 200 MON. Wait for more drift or change the target/cap; the desk will not work around the venue minimum.</div> : null}
    {review?.status === 'BLOCK' && review.code === 'INSUFFICIENT_DEPTH' ? <div className="notice danger"><strong>Not enough visible liquidity.</strong><br />The order book cannot fill the whole proposal now, so no transaction is prepared.</div> : null}
    <div className="decision-next">{decision.status === 'REVIEW' && review?.status === 'REVIEW' ? `Next: prepare the protected Kuru ${decision.side === 'BUY_BASE' ? 'buy' : 'sell'} below.` : 'No wallet action is requested.'}</div>
  </aside>;
}
