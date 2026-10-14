'use client';

import { useEffect, useRef, useState } from 'react';
import type { Address, Hex } from 'viem';
import { useConnection, useWriteContract } from 'wagmi';
import {
  decodeKuruTrades, ERC20_APPROVAL_ABI, hasExactApprovalEvent, KURU_DIRECT_ORDER_ABI,
  readWalletBalances, type NativeBuyPreparationDto,
} from '@monad-strategy/kuru-adapter';
import { quoteFreshness } from '@/lib/allocation';
import { formatCompactAtoms } from '@/lib/format';
import { publicClient } from '@/lib/public-client';
import { beginJournalRecord, isProtectedTradeOutcome, portfolioAllocationBps, recordPreparedAction, updateJournalRecord, walletFailureStatus } from '@/lib/transaction-journal';
import { assertWalletExecutionContext, readProviderWalletState } from '@/lib/wallet-state';
import { assertBuyRevalidation } from '@/lib/execution-review';
import { useNowSeconds } from '@/lib/use-now-seconds';
import type { PreviewProgress } from '@/lib/workflow-progress';

type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; code: string; message: string } | { kind: 'ready'; preparation: NativeBuyPreparationDto; receivedAtSeconds: bigint };
const EXECUTION_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION === 'true';

export function NativeBuyPreflight({ account, quoteAmountAtoms, onPreviewStateChange }: { account: Address; quoteAmountAtoms: bigint; onPreviewStateChange: (state: PreviewProgress) => void }) {
  const connection = useConnection();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [message, setMessage] = useState('');
  const inFlight = useRef(false);
  const nowSeconds = useNowSeconds();
  const freshness = state.kind === 'ready' ? quoteFreshness(BigInt(state.preparation.expiresAtSeconds), nowSeconds) : null;

  useEffect(() => {
    if (freshness === 'EXPIRED') onPreviewStateChange('idle');
  }, [freshness, onPreviewStateChange]);

  async function requestPreflight() {
    const response = await fetch('/api/preflight/buy', { method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ account, quoteAmountAtoms: quoteAmountAtoms.toString(), slippageBps: '50' }) });
    const payload = await response.json() as { ok: true; preparation: NativeBuyPreparationDto } | { ok: false; code: string; error: string };
    if (!response.ok || !payload.ok) {
      const failure = payload as { ok: false; code: string; error: string };
      throw Object.assign(new Error(failure.error), { code: failure.code });
    }
    return payload.preparation;
  }

  async function simulate() {
    if (inFlight.current) return;
    inFlight.current = true; setState({ kind: 'loading' }); setMessage('');
    onPreviewStateChange('loading');
    try {
      const preparation = await requestPreflight();
      recordPreparedAction(window.localStorage, {
        fingerprint: preparation.fingerprint, action: 'BUY_MON', account: preparation.account, chainId: 143,
        marketAddress: preparation.marketAddress, baseAmountAtoms: preparation.expectedBaseAtoms,
        minimumQuoteAtoms: '0', quoteAmountAtoms: preparation.quoteAmountAtoms,
        quoteSizeRaw: preparation.quoteSizeRaw,
        expectedBaseAtoms: preparation.expectedBaseAtoms, minimumBaseAtoms: preparation.minimumBaseAtoms,
        beforeMonAtoms: preparation.walletMonBalanceWei, beforeUsdcAtoms: preparation.walletQuoteBalanceAtoms,
        valuationPriceX18: preparation.valuationPriceX18,
      });
      setState({ kind: 'ready', preparation, receivedAtSeconds: BigInt(Math.floor(Date.now() / 1000)) });
      onPreviewStateChange(preparation.exactBuySimulationPassed ? 'completed' : 'idle');
    } catch (error) {
      const failure = error as Error & { code?: string };
      setState({ kind: 'error', code: failure.code ?? 'PREFLIGHT_UNAVAILABLE', message: failure.message });
      onPreviewStateChange('blocked');
    } finally { inFlight.current = false; }
  }

  async function confirmApproval() {
    if (!EXECUTION_ENABLED || state.kind !== 'ready' || !state.preparation.approvalRequired || inFlight.current) return;
    inFlight.current = true; setMessage('Revalidating the exact approval…');
    let id: string | undefined; let hash: Hex | undefined;
    try {
      if (BigInt(state.preparation.expiresAtSeconds) <= BigInt(Math.floor(Date.now() / 1000))) throw new Error('The reviewed approval expired. Prepare it again.');
      const fresh = await requestPreflight();
      const provider = await readProviderWalletState(connection.status === 'connected' ? connection.connector : undefined);
      assertWalletExecutionContext(connection, fresh, undefined, provider);
      assertBuyRevalidation(state.preparation, fresh);
      if (!fresh.approvalRequired) throw new Error('Allowance already covers this buy. Simulate again before trading.');
      const journal = beginJournalRecord(window.localStorage, {
        fingerprint: fresh.fingerprint, action: 'APPROVE_USDC', account: fresh.account, chainId: 143,
        marketAddress: fresh.marketAddress, baseAmountAtoms: '0', minimumQuoteAtoms: '0',
        approvalAmountAtoms: fresh.approvalAmountAtoms, approvalSpender: fresh.approvalSpender,
      });
      id = journal.id;
      setMessage('Awaiting the exact USDC approval only. Kuru has no trade deadline; reject this request if you delay or see unexpected values.');
      hash = await writeContractAsync({ account: fresh.account, chainId: 143, address: fresh.quoteTokenAddress, abi: ERC20_APPROVAL_ABI, functionName: 'approve', args: [fresh.approvalSpender, BigInt(fresh.approvalAmountAtoms)] });
      updateJournalRecord(window.localStorage, id, { status: 'BROADCAST', hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
      if (receipt.status === 'reverted') {
        updateJournalRecord(window.localStorage, id, { status: 'REVERTED', blockNumber: receipt.blockNumber.toString() });
        setMessage('The approval reverted. No trade or retry was attempted.'); return;
      }
      if (!hasExactApprovalEvent(receipt.logs, fresh.account, fresh.approvalSpender, BigInt(fresh.approvalAmountAtoms))) {
        updateJournalRecord(window.localStorage, id, { status: 'UNRESOLVED', blockNumber: receipt.blockNumber.toString(), error: 'Receipt succeeded without the exact expected USDC Approval event.' });
        setMessage('Approval receipt found, but the exact Approval event was not verified.'); return;
      }
      updateJournalRecord(window.localStorage, id, { status: 'CONFIRMED', blockNumber: receipt.blockNumber.toString(), networkFeeWei: (receipt.gasUsed * receipt.effectiveGasPrice).toString() });
      setMessage('Exact approval confirmed. No trade was sent. Run a fresh simulation before separately confirming the buy.');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Approval request failed.';
      if (id) updateJournalRecord(window.localStorage, id, { status: hash ? 'UNRESOLVED' : walletFailureStatus(error), ...(hash ? { hash } : {}), error: text });
      setMessage(text);
    } finally { inFlight.current = false; }
  }

  async function confirmBuy() {
    if (!EXECUTION_ENABLED || state.kind !== 'ready' || state.preparation.approvalRequired || inFlight.current) return;
    inFlight.current = true; setMessage('Revalidating immediately before wallet confirmation…');
    let id: string | undefined; let hash: Hex | undefined;
    try {
      if (BigInt(state.preparation.expiresAtSeconds) <= BigInt(Math.floor(Date.now() / 1000))) throw new Error('The reviewed buy expired. Prepare it again.');
      const fresh = await requestPreflight();
      const provider = await readProviderWalletState(connection.status === 'connected' ? connection.connector : undefined);
      assertWalletExecutionContext(connection, fresh, undefined, provider);
      assertBuyRevalidation(state.preparation, fresh);
      if (fresh.approvalRequired || !fresh.exactBuySimulationPassed) throw new Error('Exact allowance and buy simulation are required again.');
      const journal = beginJournalRecord(window.localStorage, {
        fingerprint: fresh.fingerprint, action: 'BUY_MON', account: fresh.account, chainId: 143,
        marketAddress: fresh.marketAddress, baseAmountAtoms: fresh.expectedBaseAtoms, minimumQuoteAtoms: '0',
        quoteAmountAtoms: fresh.quoteAmountAtoms, expectedBaseAtoms: fresh.expectedBaseAtoms,
        quoteSizeRaw: fresh.quoteSizeRaw,
        minimumBaseAtoms: fresh.minimumBaseAtoms, beforeMonAtoms: fresh.walletMonBalanceWei,
        beforeUsdcAtoms: fresh.walletQuoteBalanceAtoms,
        valuationPriceX18: fresh.valuationPriceX18,
      });
      id = journal.id; setMessage('Awaiting explicit wallet confirmation. Kuru has no onchain deadline—reject the request if you delay or see unexpected values.');
      hash = await writeContractAsync({ account: fresh.account, chainId: 143, address: fresh.marketAddress, abi: KURU_DIRECT_ORDER_ABI, functionName: 'placeAndExecuteMarketBuy', args: [BigInt(fresh.quoteSizeRaw), BigInt(fresh.minimumBaseAtoms), false, true], value: 0n });
      updateJournalRecord(window.localStorage, id, { status: 'BROADCAST', hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
      if (receipt.status === 'reverted') {
        updateJournalRecord(window.localStorage, id, { status: 'REVERTED', blockNumber: receipt.blockNumber.toString() });
        setMessage('The buy reverted. No retry was attempted.'); return;
      }
      const trades = decodeKuruTrades(receipt.logs, fresh.account).filter((trade) => trade.isBuy);
      if (trades.length === 0) {
        updateJournalRecord(window.localStorage, id, { status: 'UNRESOLVED', blockNumber: receipt.blockNumber.toString(), error: 'Successful receipt contained no matching Kuru buy Trade event.' });
        setMessage('Receipt found, but no matching Kuru buy fill was verified.'); return;
      }
      const after = await readWalletBalances(publicClient, fresh.account);
      const networkFeeWei = receipt.gasUsed * receipt.effectiveGasPrice;
      const receivedBase = after.mon + networkFeeWei >= BigInt(fresh.walletMonBalanceWei) ? after.mon + networkFeeWei - BigInt(fresh.walletMonBalanceWei) : undefined;
      const filledSizeRaw = trades.reduce((sum, trade) => sum + trade.filledSizeRaw, 0n);
      if (!isProtectedTradeOutcome({ buying: true, filledSizeRaw, receivedAtoms: receivedBase, minimumReceivedAtoms: BigInt(fresh.minimumBaseAtoms) })) {
        updateJournalRecord(window.localStorage, id, { status: 'UNRESOLVED', blockNumber: receipt.blockNumber.toString(), filledSizeRaw: filledSizeRaw.toString(), networkFeeWei: networkFeeWei.toString(), afterMonAtoms: after.mon.toString(), afterUsdcAtoms: after.usdc.toString(), error: 'Receipt did not prove a wallet MON increase meeting the protected minimum.' });
        setMessage('Receipt succeeded, but the protected MON outcome was not proven. Marked unresolved.');
        return;
      }
      updateJournalRecord(window.localStorage, id, { status: 'CONFIRMED', blockNumber: receipt.blockNumber.toString(), filledSizeRaw: filledSizeRaw.toString(), networkFeeWei: networkFeeWei.toString(), afterMonAtoms: after.mon.toString(), afterUsdcAtoms: after.usdc.toString(), beforeAllocationBps: portfolioAllocationBps(BigInt(fresh.walletMonBalanceWei), BigInt(fresh.walletQuoteBalanceAtoms), BigInt(fresh.valuationPriceX18)).toString(), afterAllocationBps: portfolioAllocationBps(after.mon, after.usdc, BigInt(fresh.valuationPriceX18)).toString(), ...(receivedBase === undefined ? {} : { receivedBaseAtoms: receivedBase.toString() }) });
      window.dispatchEvent(new Event('strategy-desk:balances-stale'));
      setMessage(`Confirmed with ${trades.length} verified Kuru buy fill event${trades.length === 1 ? '' : 's'}.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Buy request failed.';
      if (id) updateJournalRecord(window.localStorage, id, { status: hash ? 'UNRESOLVED' : walletFailureStatus(error), ...(hash ? { hash } : {}), error: text });
      setMessage(text);
    } finally { inFlight.current = false; }
  }

  return <section className="preflight" aria-live="polite"><div className="preflight-head"><div><span className="eyebrow">Protected Kuru buy</span><h3>Preview the USDC approval and MON buy before either wallet request.</h3></div><button className="button small" type="button" onClick={simulate} disabled={state.kind === 'loading'}>{state.kind === 'loading' ? 'Preparing…' : 'Prepare buy'}</button></div>
    <p className="supporting-copy">Quotes the direct order book, checks the exact USDC balance and allowance, applies the declared 200 MON product floor, and requires a full fill with 0.50% output protection.</p>
    {state.kind === 'error' ? <div className="notice danger"><strong>{state.code}</strong><br />{state.message}</div> : null}
    {state.kind === 'ready' ? <BuyReview value={state.preparation} nowSeconds={nowSeconds} onApprove={confirmApproval} onBuy={confirmBuy} message={message} /> : null}
  </section>;
}

function BuyReview({ value, nowSeconds, onApprove, onBuy, message }: { value: NativeBuyPreparationDto; nowSeconds: bigint; onApprove: () => void; onBuy: () => void; message: string }) {
  const freshness = quoteFreshness(BigInt(value.expiresAtSeconds), nowSeconds);
  return <div className="prepared-review"><div className="review-metrics">
    <Metric label="You would spend" value={`${formatCompactAtoms(BigInt(value.quoteAmountAtoms), 6, 6)} USDC`} />
    <Metric label="Estimated received" value={`${formatCompactAtoms(BigInt(value.expectedBaseAtoms), 18, 6)} MON`} />
    <Metric label="Protected minimum" value={`${formatCompactAtoms(BigInt(value.minimumBaseAtoms), 18, 6)} MON`} />
    <Metric label="Declared market floor" value={`${formatCompactAtoms(BigInt(value.declaredMinimumBaseAtoms), 18, 0)} MON`} />
    <Metric label="Price impact" value={`${formatCompactAtoms(BigInt(value.estimatedPriceImpactBps), 2, 2)}%`} />
    <Metric label="Slippage protection" value="0.50% · full fill required" />
    <Metric label="Kuru taker fee" value={`${formatCompactAtoms(BigInt(value.takerFeeBps), 2, 2)}%`} />
    <Metric label="USDC allowance" value={value.approvalRequired ? 'Exact approval required' : 'Sufficient for this buy'} />
    <Metric label="Approval amount" value={value.approvalRequired ? `${formatCompactAtoms(BigInt(value.approvalAmountAtoms), 6, 6)} USDC` : 'None'} />
    <Metric label="Approval fee ceiling" value={value.approvalRequired ? `${formatCompactAtoms(BigInt(value.maximumApprovalGasCostWei), 18, 6)} MON` : 'Not required'} />
    <Metric label="Buy fee ceiling" value={value.maximumBuyGasCostWei === null ? 'Available after approval' : `${formatCompactAtoms(BigInt(value.maximumBuyGasCostWei), 18, 6)} MON`} />
    <Metric label="Buy simulation" value={value.exactBuySimulationPassed ? 'Passed as connected account' : 'Pending approval'} />
    <Metric label="Quote status" value={freshness === 'FRESH' ? 'Fresh · 20-second window' : freshness === 'EXPIRING' ? 'Expiring now' : 'Expired · prepare again'} />
  </div><details><summary>Contract and approval evidence</summary><div className="evidence-list compact-evidence"><div className="evidence-row"><span>USDC token</span><strong>{value.quoteTokenAddress}</strong></div><div className="evidence-row"><span>Approval spender</span><strong>{value.approvalSpender}</strong></div><div className="evidence-row"><span>Kuru market</span><strong>{value.marketAddress}</strong></div><div className="evidence-row"><span>Payment</span><strong>USDC transferFrom · msg.value 0</strong></div><div className="evidence-row"><span>Fill rule</span><strong>Fill or kill · no partial fill accepted</strong></div><div className="evidence-row"><span>Failure conditions</span><strong>quote expiry, account/network change, insufficient USDC or MON gas, allowance change, proxy upgrade, stale book, inadequate full-fill liquidity, output below minimum</strong></div></div></details>
    <div className="execution-gate"><button className="button" type="button" onClick={value.approvalRequired ? onApprove : onBuy} disabled={!EXECUTION_ENABLED || freshness !== 'FRESH'}>{EXECUTION_ENABLED ? freshness === 'FRESH' ? value.approvalRequired ? 'Approve exact USDC amount' : 'Revalidate and confirm buy' : 'Prepare a fresh review' : 'Mainnet execution disabled'}</button><span>{freshness === 'EXPIRED' ? 'This browser review expired. Kuru itself does not enforce that expiry.' : value.approvalRequired ? 'Approval and buy are always separate confirmations. Approval never triggers a trade.' : 'The fresh buy must preserve or improve the reviewed output and gas ceilings.'}</span></div>{message ? <div className="notice">{message}</div> : null}</div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="review-metric"><span>{label}</span><strong>{value}</strong></div>; }
