'use client';

import { useRef, useState } from 'react';
import type { Address } from 'viem';
import { useConnection, useWriteContract } from 'wagmi';
import {
  decodeKuruTrades,
  KURU_DIRECT_ORDER_ABI,
  MONAD_MAINNET_CHAIN_ID,
  type NativeSellPreparationDto,
  readWalletBalances,
} from '@monad-strategy/kuru-adapter';
import { quoteFreshness } from '@/lib/allocation';
import { formatCompactAtoms } from '@/lib/format';
import { publicClient } from '@/lib/public-client';
import {
  beginJournalRecord,
  recordPreparedAction,
  portfolioAllocationBps,
  updateJournalRecord,
  walletFailureStatus,
  isProtectedTradeOutcome,
} from '@/lib/transaction-journal';
import { assertWalletExecutionContext, readProviderWalletState } from '@/lib/wallet-state';
import { assertSellRevalidation } from '@/lib/execution-review';
import { useNowSeconds } from '@/lib/use-now-seconds';

type PreflightState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; code: string; message: string }
  | { kind: 'ready'; preparation: NativeSellPreparationDto; receivedAtSeconds: bigint };

const EXECUTION_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION === 'true';

export function NativeSellPreflight({ account, baseAmountAtoms }: { account: Address; baseAmountAtoms: bigint }) {
  const connection = useConnection();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<PreflightState>({ kind: 'idle' });
  const [executionMessage, setExecutionMessage] = useState('');
  const inFlight = useRef(false);
  const nowSeconds = useNowSeconds();

  async function requestPreflight(): Promise<NativeSellPreparationDto> {
    const response = await fetch('/api/preflight/sell', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ account, baseAmountAtoms: baseAmountAtoms.toString(), slippageBps: '50' }),
    });
    const payload = await response.json() as
      | { ok: true; preparation: NativeSellPreparationDto }
      | { ok: false; code: string; error: string };
    if (!response.ok || !payload.ok) {
      const failure = payload as { ok: false; code: string; error: string };
      throw Object.assign(new Error(failure.error), { code: failure.code });
    }
    return payload.preparation;
  }

  async function simulate() {
    if (inFlight.current) return;
    inFlight.current = true;
    setState({ kind: 'loading' });
    setExecutionMessage('');
    try {
      const preparation = await requestPreflight();
      recordPreparedAction(window.localStorage, {
        fingerprint: preparation.fingerprint, action: 'SELL_MON', account: preparation.account, chainId: 143,
        marketAddress: preparation.marketAddress, baseAmountAtoms: preparation.baseAmountAtoms,
        sizeRaw: preparation.sizeRaw,
        minimumQuoteAtoms: preparation.minimumQuoteAtoms, expectedQuoteAtoms: preparation.expectedQuoteAtoms,
        beforeMonAtoms: preparation.walletBalanceWei, beforeUsdcAtoms: preparation.walletQuoteBalanceAtoms,
        valuationPriceX18: preparation.valuationPriceX18,
      });
      setState({ kind: 'ready', preparation, receivedAtSeconds: BigInt(Math.floor(Date.now() / 1000)) });
    } catch (error) {
      const failure = error as Error & { code?: string };
      setState({ kind: 'error', code: failure.code ?? 'PREFLIGHT_UNAVAILABLE', message: failure.message });
    } finally {
      inFlight.current = false;
    }
  }

  async function execute() {
    if (!EXECUTION_ENABLED || state.kind !== 'ready' || inFlight.current) return;
    inFlight.current = true;
    setExecutionMessage('Revalidating immediately before wallet confirmation…');
    let journalId: string | undefined;
    let hash: `0x${string}` | undefined;
    try {
      if (BigInt(state.preparation.expiresAtSeconds) <= BigInt(Math.floor(Date.now() / 1000))) {
        throw new Error('The reviewed sell expired. Run a new simulation before opening the wallet.');
      }
      if (connection.status !== 'connected' || !connection.address || connection.chainId !== MONAD_MAINNET_CHAIN_ID) {
        throw new Error('Wallet account or network changed. Reconnect and simulate again.');
      }
      const fresh = await requestPreflight();
      const now = BigInt(Math.floor(Date.now() / 1000));
      const provider = await readProviderWalletState(connection.status === 'connected' ? connection.connector : undefined);
      assertWalletExecutionContext(connection, fresh, now, provider);
      assertSellRevalidation(state.preparation, fresh);
      const journal = beginJournalRecord(window.localStorage, {
        fingerprint: fresh.fingerprint,
        action: 'SELL_MON',
        account: fresh.account,
        chainId: 143,
        marketAddress: fresh.marketAddress,
        baseAmountAtoms: fresh.baseAmountAtoms,
        sizeRaw: fresh.sizeRaw,
        minimumQuoteAtoms: fresh.minimumQuoteAtoms,
        expectedQuoteAtoms: fresh.expectedQuoteAtoms,
        beforeMonAtoms: fresh.walletBalanceWei,
        beforeUsdcAtoms: fresh.walletQuoteBalanceAtoms,
        valuationPriceX18: fresh.valuationPriceX18,
      });
      journalId = journal.id;
      setExecutionMessage('Awaiting explicit confirmation in your wallet. Kuru has no onchain deadline—reject the request if you delay or see unexpected values.');
      hash = await writeContractAsync({
        account: fresh.account,
        chainId: 143,
        address: fresh.marketAddress,
        abi: KURU_DIRECT_ORDER_ABI,
        functionName: 'placeAndExecuteMarketSell',
        args: [BigInt(fresh.sizeRaw), BigInt(fresh.minimumQuoteAtoms), false, true],
        value: BigInt(fresh.baseAmountAtoms),
      });
      updateJournalRecord(window.localStorage, journal.id, { status: 'BROADCAST', hash });
      setExecutionMessage(`Broadcast ${hash.slice(0, 10)}… Waiting for a receipt; the app will not retry.`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
      if (receipt.status === 'reverted') {
        updateJournalRecord(window.localStorage, journal.id, { status: 'REVERTED', blockNumber: receipt.blockNumber.toString() });
        setExecutionMessage('Transaction reverted. No retry was attempted.');
        return;
      }
      const trades = decodeKuruTrades(receipt.logs, fresh.account).filter((trade) => !trade.isBuy);
      if (trades.length === 0) {
        updateJournalRecord(window.localStorage, journal.id, { status: 'UNRESOLVED', blockNumber: receipt.blockNumber.toString(), error: 'Successful receipt contained no verified Kuru Trade event.' });
        setExecutionMessage('Receipt found, but no matching Kuru Trade event was verified. Marked unresolved.');
        return;
      }
      const filledSizeRaw = trades.reduce((sum, trade) => sum + trade.filledSizeRaw, 0n);
      const after = await readWalletBalances(publicClient, fresh.account);
      const received = after.usdc >= BigInt(fresh.walletQuoteBalanceAtoms) ? after.usdc - BigInt(fresh.walletQuoteBalanceAtoms) : undefined;
      if (!isProtectedTradeOutcome({ buying: false, filledSizeRaw, requestedSizeRaw: BigInt(fresh.sizeRaw), receivedAtoms: received, minimumReceivedAtoms: BigInt(fresh.minimumQuoteAtoms) })) {
        updateJournalRecord(window.localStorage, journal.id, { status: 'UNRESOLVED', blockNumber: receipt.blockNumber.toString(), filledSizeRaw: filledSizeRaw.toString(), afterMonAtoms: after.mon.toString(), afterUsdcAtoms: after.usdc.toString(), networkFeeWei: (receipt.gasUsed * receipt.effectiveGasPrice).toString(), error: 'Receipt did not prove the full requested sell size and protected USDC wallet outcome.' });
        setExecutionMessage('Receipt succeeded, but the full protected sell outcome was not proven. Marked unresolved.');
        return;
      }
      updateJournalRecord(window.localStorage, journal.id, { status: 'CONFIRMED', blockNumber: receipt.blockNumber.toString(), filledSizeRaw: filledSizeRaw.toString(), networkFeeWei: (receipt.gasUsed * receipt.effectiveGasPrice).toString(), afterMonAtoms: after.mon.toString(), afterUsdcAtoms: after.usdc.toString(), beforeAllocationBps: portfolioAllocationBps(BigInt(fresh.walletBalanceWei), BigInt(fresh.walletQuoteBalanceAtoms), BigInt(fresh.valuationPriceX18)).toString(), afterAllocationBps: portfolioAllocationBps(after.mon, after.usdc, BigInt(fresh.valuationPriceX18)).toString(), ...(received === undefined ? {} : { receivedQuoteAtoms: received.toString() }) });
      window.dispatchEvent(new Event('strategy-desk:balances-stale'));
      setExecutionMessage(`Confirmed with ${trades.length} verified Kuru fill event${trades.length === 1 ? '' : 's'}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wallet or receipt request failed.';
      if (journalId) updateJournalRecord(window.localStorage, journalId, {
        status: hash ? 'UNRESOLVED' : walletFailureStatus(error),
        ...(hash ? { hash } : {}),
        error: message,
      });
      setExecutionMessage(message);
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <section className="preflight" aria-live="polite">
      <div className="preflight-head">
        <div><span className="eyebrow">Exact Kuru preflight</span><h3>Simulate the transaction that the wallet would receive.</h3></div>
        <button className="button small" type="button" onClick={simulate} disabled={state.kind === 'loading'}>{state.kind === 'loading' ? 'Simulating…' : 'Run simulation'}</button>
      </div>
      <p className="supporting-copy">Re-reads the proxy, order book, balance and gas; then simulates a 0.50% protected, fill-or-kill native MON sell. Simulation never signs or broadcasts.</p>
      {state.kind === 'error' ? <div className="notice danger"><strong>{state.code}</strong><br />{state.message}</div> : null}
      {state.kind === 'ready' ? <PreparedReview value={state.preparation} nowSeconds={nowSeconds} onExecute={execute} executionMessage={executionMessage} /> : null}
    </section>
  );
}

function PreparedReview({ value, nowSeconds, onExecute, executionMessage }: { value: NativeSellPreparationDto; nowSeconds: bigint; onExecute: () => void; executionMessage: string }) {
  const freshness = quoteFreshness(BigInt(value.expiresAtSeconds), nowSeconds);
  return (
    <div className="prepared-review">
      <div className="review-metrics">
        <Metric label="You would sell" value={`${formatCompactAtoms(BigInt(value.baseAmountAtoms), 18, 6)} MON`} />
        <Metric label="Estimated received" value={`${formatCompactAtoms(BigInt(value.expectedQuoteAtoms), 6, 6)} USDC`} />
        <Metric label="Protected minimum" value={`${formatCompactAtoms(BigInt(value.minimumQuoteAtoms), 6, 6)} USDC`} />
        <Metric label="Price impact" value={`${formatCompactAtoms(BigInt(value.estimatedPriceImpactBps), 2, 2)}%`} />
        <Metric label="Slippage protection" value="0.50% · full fill required" />
        <Metric label="Estimated network fee ceiling" value={`${formatCompactAtoms(BigInt(value.maximumGasCostWei), 18, 6)} MON`} />
        <Metric label="Kuru taker fee" value={`${formatCompactAtoms(BigInt(value.takerFeeBps), 2, 2)}%`} />
        <Metric label="Quote status" value={freshness === 'FRESH' ? 'Fresh · 20-second window' : freshness === 'EXPIRING' ? 'Expiring now' : 'Expired · simulate again'} />
      </div>
      <details><summary>Contract evidence</summary><div className="evidence-list compact-evidence"><div className="evidence-row"><span>Market</span><strong>{value.marketAddress}</strong></div><div className="evidence-row"><span>Implementation</span><strong>{value.implementationAddress}</strong></div><div className="evidence-row"><span>Code hash</span><strong>{value.implementationCodeHash}</strong></div><div className="evidence-row"><span>Failure conditions</span><strong>quote expiry, account/network change, insufficient MON or gas, proxy upgrade, stale book, inadequate full-fill liquidity, output below minimum</strong></div></div></details>
      <div className="execution-gate">
        <button className="button" type="button" onClick={onExecute} disabled={!EXECUTION_ENABLED || freshness !== 'FRESH'}>{EXECUTION_ENABLED ? freshness === 'FRESH' ? 'Revalidate and confirm in wallet' : 'Prepare a fresh review' : 'Mainnet execution disabled'}</button>
        <span>{freshness === 'EXPIRED' ? 'This browser review expired. Kuru itself does not enforce that expiry.' : EXECUTION_ENABLED ? 'A fresh simulation must preserve or improve the reviewed output and gas ceilings.' : 'Owner approval and NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=true are both required.'}</span>
      </div>
      {executionMessage ? <div className="notice">{executionMessage}</div> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="review-metric"><span>{label}</span><strong>{value}</strong></div>;
}
