'use client';

import { useCallback, useEffect, useState } from 'react';
import { TransactionReceiptNotFoundError, type Hex } from 'viem';
import { decodeKuruTrades, MONAD_EXPLORER_URL, readWalletBalances } from '@monad-strategy/kuru-adapter';
import { formatCompactAtoms } from '@/lib/format';
import { publicClient } from '@/lib/public-client';
import Link from 'next/link';
import { readJournal, updateJournalRecord, type JournalRecord } from '@/lib/transaction-journal';

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
        const trades = decodeKuruTrades(receipt.logs, record.account);
        if (trades.length === 0) {
          updateJournalRecord(window.localStorage, record.id, { status: 'UNRESOLVED', blockNumber: receipt.blockNumber.toString(), error: 'Receipt has no matching Kuru Trade event.' });
          continue;
        }
        const after = await readWalletBalances(publicClient, record.account);
        const beforeUsdc = record.beforeUsdcAtoms ? BigInt(record.beforeUsdcAtoms) : null;
        updateJournalRecord(window.localStorage, record.id, {
          status: 'CONFIRMED',
          blockNumber: receipt.blockNumber.toString(),
          filledSizeRaw: trades.reduce((sum, trade) => sum + trade.filledSizeRaw, 0n).toString(),
          afterMonAtoms: after.mon.toString(),
          afterUsdcAtoms: after.usdc.toString(),
          ...(beforeUsdc !== null && after.usdc >= beforeUsdc ? { receivedQuoteAtoms: (after.usdc - beforeUsdc).toString() } : {}),
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
    return <section className="card record-empty"><div><div className="empty-icon">0</div><span className="eyebrow">No local activity yet</span><h2>Your verified actions will appear here.</h2><p>Start at the strategy desk to review your portfolio. Simulations do not create trade history, and execution is currently disabled.</p><Link className="button small" href="/desk">Open strategy desk</Link><p className="empty-footnote">This is history from this browser only—not a complete wallet or Kuru account history.</p></div></section>;
  }
  return (
    <section className="activity-stack">
      <div className="activity-toolbar"><span>{records.length} browser record{records.length === 1 ? '' : 's'}</span><button className="button small secondary" type="button" disabled={checking} onClick={reconcile}>{checking ? 'Reconciling…' : 'Reconcile receipts'}</button></div>
      {records.map((record) => <article className="card activity-record" key={record.id}>
        <div className="activity-record-head"><div><span className="eyebrow">MON → USDC on Kuru</span><h2>Sell {formatCompactAtoms(BigInt(record.baseAmountAtoms), 18, 6)} MON</h2><p>{statusSentence(record)}</p></div><span className={`record-status status-${record.status.toLowerCase()}`}>{record.status.replace('_', ' ')}</span></div>
        <div className="activity-outcome"><div><span>Attempted</span><strong>{formatCompactAtoms(BigInt(record.baseAmountAtoms), 18, 6)} MON</strong></div><div><span>Received</span><strong>{record.receivedQuoteAtoms ? `${formatCompactAtoms(BigInt(record.receivedQuoteAtoms), 6, 6)} USDC` : 'Not yet verified'}</strong></div><div><span>Protected minimum</span><strong>{formatCompactAtoms(BigInt(record.minimumQuoteAtoms), 6, 6)} USDC</strong></div></div>
        {record.beforeMonAtoms && record.afterMonAtoms ? <div className="allocation-change"><span>Wallet MON</span><strong>{formatCompactAtoms(BigInt(record.beforeMonAtoms), 18, 4)} → {formatCompactAtoms(BigInt(record.afterMonAtoms), 18, 4)}</strong></div> : null}
        {record.beforeUsdcAtoms && record.afterUsdcAtoms ? <div className="allocation-change"><span>Wallet USDC</span><strong>{formatCompactAtoms(BigInt(record.beforeUsdcAtoms), 6, 4)} → {formatCompactAtoms(BigInt(record.afterUsdcAtoms), 6, 4)}</strong></div> : null}
        {record.hash ? <a className="button small secondary" href={`${MONAD_EXPLORER_URL}/tx/${record.hash}`} target="_blank" rel="noreferrer">View transaction on Monad ↗</a> : null}
        <details className="technical-evidence"><summary>Technical evidence</summary><div className="evidence-list compact-evidence"><div className="evidence-row"><span>Network</span><strong>Monad mainnet · 143</strong></div><div className="evidence-row"><span>Kuru market</span><strong>{record.marketAddress}</strong></div><div className="evidence-row"><span>Account</span><strong>{record.account}</strong></div>{record.hash ? <div className="evidence-row"><span>Transaction hash</span><strong>{record.hash}</strong></div> : null}{record.blockNumber ? <div className="evidence-row"><span>Block</span><strong>{record.blockNumber}</strong></div> : null}{record.filledSizeRaw ? <div className="evidence-row"><span>Trade event fill</span><strong>{record.filledSizeRaw} raw size</strong></div> : null}{record.error ? <div className="evidence-row"><span>Evidence note</span><strong>{record.error}</strong></div> : null}</div></details>
        <p className="activity-time">Last updated {new Date(record.updatedAt).toLocaleString()}</p>
      </article>)}
    </section>
  );
}

function statusSentence(record: JournalRecord): string {
  if (record.status === 'CONFIRMED') return 'Confirmed on Monad with a matching Kuru Trade event.';
  if (record.status === 'REVERTED') return 'The chain confirmed that this transaction reverted.';
  if (record.status === 'REJECTED') return 'The wallet request was rejected before broadcast.';
  if (record.status === 'BROADCAST') return 'Submitted to Monad; waiting for a receipt.';
  if (record.status === 'AWAITING_WALLET') return 'The wallet request started, but no transaction hash is recorded.';
  return 'The final outcome could not yet be verified. No retry was sent.';
}
