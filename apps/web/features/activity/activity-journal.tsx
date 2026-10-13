'use client';

import { useCallback, useEffect, useState } from 'react';
import { TransactionReceiptNotFoundError, type Hex } from 'viem';
import { decodeKuruTrades, MONAD_EXPLORER_URL } from '@monad-strategy/kuru-adapter';
import { formatCompactAtoms } from '@/lib/format';
import { publicClient } from '@/lib/public-client';
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
        updateJournalRecord(window.localStorage, record.id, {
          status: 'CONFIRMED',
          blockNumber: receipt.blockNumber.toString(),
          filledSizeRaw: trades.reduce((sum, trade) => sum + trade.filledSizeRaw, 0n).toString(),
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
    return <section className="card record-empty"><div><div className="empty-icon">∅</div><span className="eyebrow">Verified empty state</span><h2>No wallet actions from this application</h2><p>Simulation does not create history. A record appears only if the guarded execution path reaches the wallet, and execution is disabled by default.</p><div className="notice" style={{ marginTop: 20 }}>Nothing here is inferred from sample data or fabricated activity.</div></div></section>;
  }
  return (
    <section className="activity-stack">
      <div className="activity-toolbar"><span>{records.length} browser record{records.length === 1 ? '' : 's'}</span><button className="button small secondary" type="button" disabled={checking} onClick={reconcile}>{checking ? 'Reconciling…' : 'Reconcile receipts'}</button></div>
      {records.map((record) => <article className="card activity-record" key={record.id}>
        <div className="activity-record-head"><div><span className="eyebrow">Native MON sell</span><h2>{formatCompactAtoms(BigInt(record.baseAmountAtoms), 18, 6)} MON</h2></div><span className={`record-status status-${record.status.toLowerCase()}`}>{record.status.replace('_', ' ')}</span></div>
        <div className="evidence-list"><div className="evidence-row"><span>Account</span><strong>{record.account}</strong></div><div className="evidence-row"><span>Minimum output</span><strong>{formatCompactAtoms(BigInt(record.minimumQuoteAtoms), 6, 6)} USDC</strong></div>{record.hash ? <div className="evidence-row"><span>Transaction</span><strong><a className="underlined-link" href={`${MONAD_EXPLORER_URL}/tx/${record.hash}`} target="_blank" rel="noreferrer">{record.hash}</a></strong></div> : null}{record.blockNumber ? <div className="evidence-row"><span>Block</span><strong>{record.blockNumber}</strong></div> : null}{record.filledSizeRaw ? <div className="evidence-row"><span>Verified fills</span><strong>{record.filledSizeRaw} raw size</strong></div> : null}{record.error ? <div className="evidence-row"><span>Evidence note</span><strong>{record.error}</strong></div> : null}</div>
        <p className="activity-time">Last updated {new Date(record.updatedAt).toLocaleString()}</p>
      </article>)}
    </section>
  );
}
