'use client';

import { useCallback, useEffect, useState } from 'react';
import { TransactionReceiptNotFoundError, type Hex } from 'viem';
import { decodeKuruTrades, hasExactApprovalEvent, MONAD_EXPLORER_URL, readWalletBalances } from '@monad-strategy/kuru-adapter';
import { formatCompactAtoms } from '@/lib/format';
import { publicClient } from '@/lib/public-client';
import Link from 'next/link';
import { isProtectedTradeOutcome, portfolioAllocationBps, readJournal, updateJournalRecord, type JournalRecord } from '@/lib/transaction-journal';
import { AllowanceRecovery } from './allowance-recovery';

export function ActivityJournal() {
  const [records, setRecords] = useState<JournalRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);

  const reconcile = useCallback(async () => {
    const current = readJournal(window.localStorage);
    setChecking(true);
    for (const record of current) {
      if (record.status === 'AWAITING_WALLET' && !record.hash) {
        updateJournalRecord(window.localStorage, record.id, { status: 'UNRESOLVED', error: 'Wallet flow ended before a transaction hash was recorded. No retry was sent.' });
        continue;
      }
      if (!record.hash || !['BROADCAST', 'UNRESOLVED'].includes(record.status)) continue;
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: record.hash as Hex });
        if (receipt.status === 'reverted') {
          updateJournalRecord(window.localStorage, record.id, { status: 'REVERTED', blockNumber: receipt.blockNumber.toString() });
          continue;
        }
        if (record.action === 'APPROVE_USDC' || record.action === 'REVOKE_USDC') {
          const exact = record.approvalSpender && record.approvalAmountAtoms && hasExactApprovalEvent(receipt.logs, record.account, record.approvalSpender, BigInt(record.approvalAmountAtoms));
          updateJournalRecord(window.localStorage, record.id, exact ? { status: 'CONFIRMED', blockNumber: receipt.blockNumber.toString(), networkFeeWei: (receipt.gasUsed * receipt.effectiveGasPrice).toString(), reconciledAt: new Date().toISOString() } : { status: 'UNRESOLVED', blockNumber: receipt.blockNumber.toString(), error: 'Receipt has no exact matching USDC Approval event.', reconciledAt: new Date().toISOString() });
          continue;
        }
        const buying = record.action === 'BUY_MON';
        const trades = decodeKuruTrades(receipt.logs, record.account).filter((trade) => trade.isBuy === buying);
        if (trades.length === 0) {
          updateJournalRecord(window.localStorage, record.id, { status: 'UNRESOLVED', blockNumber: receipt.blockNumber.toString(), error: 'Receipt has no matching Kuru Trade event.' });
          continue;
        }
        const after = await readWalletBalances(publicClient, record.account);
        const beforeUsdc = record.beforeUsdcAtoms ? BigInt(record.beforeUsdcAtoms) : null;
        const beforeMon = record.beforeMonAtoms ? BigInt(record.beforeMonAtoms) : null;
        const networkFeeWei = receipt.gasUsed * receipt.effectiveGasPrice;
        const receivedBase = buying && beforeMon !== null && after.mon + networkFeeWei >= beforeMon ? after.mon + networkFeeWei - beforeMon : undefined;
        const filledSizeRaw = trades.reduce((sum, trade) => sum + trade.filledSizeRaw, 0n);
        const receivedQuote = !buying && beforeUsdc !== null && after.usdc >= beforeUsdc ? after.usdc - beforeUsdc : undefined;
        const hasRecordedProtection = buying ? record.minimumBaseAtoms !== undefined : record.sizeRaw !== undefined;
        const outcomeProven = hasRecordedProtection && isProtectedTradeOutcome({ buying, filledSizeRaw, ...(record.sizeRaw === undefined ? {} : { requestedSizeRaw: BigInt(record.sizeRaw) }), receivedAtoms: buying ? receivedBase : receivedQuote, minimumReceivedAtoms: buying ? BigInt(record.minimumBaseAtoms!) : BigInt(record.minimumQuoteAtoms) });
        if (!outcomeProven) {
          updateJournalRecord(window.localStorage, record.id, { status: 'UNRESOLVED', blockNumber: receipt.blockNumber.toString(), filledSizeRaw: filledSizeRaw.toString(), afterMonAtoms: after.mon.toString(), afterUsdcAtoms: after.usdc.toString(), networkFeeWei: networkFeeWei.toString(), reconciledAt: new Date().toISOString(), error: buying ? 'Receipt did not prove a wallet MON increase meeting the protected minimum.' : 'Receipt did not prove the full requested sell size and protected USDC wallet outcome.' });
          continue;
        }
        const price = record.valuationPriceX18 ? BigInt(record.valuationPriceX18) : null;
        updateJournalRecord(window.localStorage, record.id, {
          status: 'CONFIRMED',
          blockNumber: receipt.blockNumber.toString(),
          filledSizeRaw: filledSizeRaw.toString(),
          afterMonAtoms: after.mon.toString(),
          afterUsdcAtoms: after.usdc.toString(),
          networkFeeWei: networkFeeWei.toString(),
          reconciledAt: new Date().toISOString(),
          ...(price !== null && beforeMon !== null && beforeUsdc !== null ? { beforeAllocationBps: portfolioAllocationBps(beforeMon, beforeUsdc, price).toString(), afterAllocationBps: portfolioAllocationBps(after.mon, after.usdc, price).toString() } : {}),
          ...(receivedQuote === undefined ? {} : { receivedQuoteAtoms: receivedQuote.toString() }),
          ...(receivedBase === undefined ? {} : { receivedBaseAtoms: receivedBase.toString() }),
        });
      } catch (error) {
        const missing = error instanceof TransactionReceiptNotFoundError || (error instanceof Error && error.name.includes('TransactionReceiptNotFound'));
        updateJournalRecord(window.localStorage, record.id, { status: 'UNRESOLVED', error: missing ? 'No receipt is currently available. No retry was sent.' : error instanceof Error ? error.message : 'Receipt lookup failed.' });
      }
    }
    setRecords(readJournal(window.localStorage));
    setReady(true);
    setChecking(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void reconcile(), 0);
    return () => window.clearTimeout(timer);
  }, [reconcile]);

  if (!ready) return <section className="card availability"><span className="eyebrow">Browser journal</span><h2>Checking locally recorded actions…</h2></section>;
  if (records.length === 0) {
    return <section className="card record-empty"><div><div className="empty-icon">0</div><span className="eyebrow">No local activity yet</span><h2>Your verified actions will appear here.</h2><p>Start in MonMix to review your portfolio. Simulations do not create trade history, and execution is currently disabled.</p><Link className="button small" href="/desk">Open MonMix</Link><p className="empty-footnote">This is history from this browser only—not a complete wallet or Kuru account history.</p></div></section>;
  }
  const allowanceAccounts = [...new Set(records.filter((record) => ['BUY_MON', 'APPROVE_USDC', 'REVOKE_USDC'].includes(record.action ?? '')).map((record) => record.account))];
  return (
    <section className="activity-stack">
      <div className="activity-toolbar"><span>{records.length} browser record{records.length === 1 ? '' : 's'}</span><button className="button small secondary" type="button" disabled={checking} onClick={reconcile}>{checking ? 'Reconciling…' : 'Reconcile receipts'}</button></div>
      {allowanceAccounts.map((account) => <AllowanceRecovery key={account} account={account} onJournalChange={() => setRecords(readJournal(window.localStorage))} />)}
      {records.map((record) => <article className="card activity-record" key={record.id}>
        <div className="activity-record-head"><div><span className="eyebrow">{activityEyebrow(record)}</span><h2>{activityTitle(record)}</h2><p>{statusSentence(record)}</p></div><span className={`record-status status-${record.status.toLowerCase()}`}>{activityStatusLabel(record)}</span></div>
        {record.status === 'PREPARED' ? <div className="local-review-note"><strong>Local review only</strong><span>No wallet signature, transaction hash, receipt, or verified fill exists for this record.</span></div> : null}
        {!['APPROVE_USDC', 'REVOKE_USDC'].includes(record.action ?? '') ? <TradeOutcome record={record} /> : <div className="activity-outcome"><div><span>{record.action === 'REVOKE_USDC' ? 'Target allowance' : 'Approval amount'}</span><strong>{formatCompactAtoms(BigInt(record.approvalAmountAtoms ?? '0'), 6, 6)} USDC</strong></div><div><span>Spender</span><strong>Kuru market</strong></div><div><span>Trade</span><strong>Not included</strong></div></div>}
        {record.beforeMonAtoms && record.afterMonAtoms ? <div className="allocation-change"><span>Wallet MON</span><strong>{formatCompactAtoms(BigInt(record.beforeMonAtoms), 18, 4)} → {formatCompactAtoms(BigInt(record.afterMonAtoms), 18, 4)}</strong></div> : null}
        {record.beforeUsdcAtoms && record.afterUsdcAtoms ? <div className="allocation-change"><span>Wallet USDC</span><strong>{formatCompactAtoms(BigInt(record.beforeUsdcAtoms), 6, 4)} → {formatCompactAtoms(BigInt(record.afterUsdcAtoms), 6, 4)}</strong></div> : null}
        {record.beforeAllocationBps && record.afterAllocationBps ? <div className="allocation-change"><span>MON allocation · preparation price</span><strong>{formatCompactAtoms(BigInt(record.beforeAllocationBps), 2, 2)}% → {formatCompactAtoms(BigInt(record.afterAllocationBps), 2, 2)}%</strong></div> : null}
        {record.networkFeeWei ? <div className="allocation-change"><span>Actual network fee</span><strong>{formatCompactAtoms(BigInt(record.networkFeeWei), 18, 6)} MON</strong></div> : null}
        {record.hash ? <a className="button small secondary" href={`${MONAD_EXPLORER_URL}/tx/${record.hash}`} target="_blank" rel="noreferrer">View transaction on Monad ↗</a> : null}
        <details className="technical-evidence"><summary>Technical evidence</summary><div className="evidence-list compact-evidence"><div className="evidence-row"><span>Network</span><strong>Monad mainnet · 143</strong></div><div className="evidence-row"><span>Kuru market</span><strong>{record.marketAddress}</strong></div><div className="evidence-row"><span>Account</span><strong>{record.account}</strong></div>{record.hash ? <div className="evidence-row"><span>Transaction hash</span><strong>{record.hash}</strong></div> : null}{record.blockNumber ? <div className="evidence-row"><span>Block</span><strong>{record.blockNumber}</strong></div> : null}{record.filledSizeRaw ? <div className="evidence-row"><span>Trade event fill</span><strong>{record.filledSizeRaw} raw size</strong></div> : null}{record.error ? <div className="evidence-row"><span>Evidence note</span><strong>{record.error}</strong></div> : null}</div></details>
        <p className="activity-time">Last updated {new Date(record.updatedAt).toLocaleString()}</p>
      </article>)}
    </section>
  );
}

function statusSentence(record: JournalRecord): string {
  if (record.status === 'PREPARED') return 'Saved from a protected simulation. It was not signed, broadcast, or executed.';
  if (record.status === 'CONFIRMED' && record.action === 'REVOKE_USDC') return 'Confirmed on Monad with an exact zero-value USDC Approval event. No trade was included.';
  if (record.status === 'CONFIRMED' && record.action === 'APPROVE_USDC') return 'Confirmed on Monad with the exact expected USDC Approval event. No trade was included.';
  if (record.status === 'CONFIRMED') return 'Confirmed on Monad with a matching Kuru Trade event.';
  if (record.status === 'REVERTED') return 'The chain confirmed that this transaction reverted.';
  if (record.status === 'REJECTED') return 'The wallet request was rejected before broadcast.';
  if (record.status === 'BROADCAST') return 'Submitted to Monad; waiting for a receipt.';
  if (record.status === 'AWAITING_WALLET') return 'The wallet request started, but no transaction hash is recorded.';
  return 'The final outcome could not yet be verified. No retry was sent.';
}

function activityEyebrow(record: JournalRecord): string {
  if (record.status === 'PREPARED') return 'Local protected review';
  if (record.action === 'BUY_MON') return 'USDC → MON on Kuru';
  if (record.action === 'APPROVE_USDC') return 'Exact USDC approval';
  if (record.action === 'REVOKE_USDC') return 'USDC allowance revocation';
  return 'MON → USDC on Kuru';
}

function activityTitle(record: JournalRecord): string {
  const prefix = record.status === 'PREPARED' ? 'Review' : '';
  if (record.action === 'BUY_MON') return `${prefix ? 'Review buying' : 'Buy'} MON with ${formatCompactAtoms(BigInt(record.quoteAmountAtoms ?? '0'), 6, 6)} USDC`;
  if (record.action === 'APPROVE_USDC') return `Approve ${formatCompactAtoms(BigInt(record.approvalAmountAtoms ?? '0'), 6, 6)} USDC`;
  if (record.action === 'REVOKE_USDC') return 'Revoke Kuru USDC allowance';
  return `${prefix ? 'Review selling' : 'Sell'} ${formatCompactAtoms(BigInt(record.baseAmountAtoms), 18, 6)} MON`;
}

function activityStatusLabel(record: JournalRecord): string {
  if (record.status === 'PREPARED') return 'LOCAL REVIEW';
  if (record.reconciledAt && record.status === 'CONFIRMED') return 'RECONCILED';
  return record.status.replace('_', ' ');
}

function TradeOutcome({ record }: { record: JournalRecord }) {
  const buying = record.action === 'BUY_MON';
  const prepared = record.status === 'PREPARED';
  const input = buying ? `${formatCompactAtoms(BigInt(record.quoteAmountAtoms ?? '0'), 6, 6)} USDC` : `${formatCompactAtoms(BigInt(record.baseAmountAtoms), 18, 6)} MON`;
  const output = buying
    ? prepared ? record.expectedBaseAtoms ? `${formatCompactAtoms(BigInt(record.expectedBaseAtoms), 18, 6)} MON estimated` : 'Estimate unavailable' : record.receivedBaseAtoms ? `${formatCompactAtoms(BigInt(record.receivedBaseAtoms), 18, 6)} MON` : 'Not yet verified'
    : prepared ? record.expectedQuoteAtoms ? `${formatCompactAtoms(BigInt(record.expectedQuoteAtoms), 6, 6)} USDC estimated` : 'Estimate unavailable' : record.receivedQuoteAtoms ? `${formatCompactAtoms(BigInt(record.receivedQuoteAtoms), 6, 6)} USDC` : 'Not yet verified';
  const minimum = buying ? `${formatCompactAtoms(BigInt(record.minimumBaseAtoms ?? '0'), 18, 6)} MON` : `${formatCompactAtoms(BigInt(record.minimumQuoteAtoms), 6, 6)} USDC`;
  return <div className="activity-outcome"><div><span>{prepared ? 'Proposed input' : 'Attempted'}</span><strong>{input}</strong></div><div><span>{prepared ? 'Estimated output' : 'Received'}</span><strong>{output}</strong></div><div><span>Protected minimum</span><strong>{minimum}</strong></div></div>;
}
