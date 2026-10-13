import assert from 'node:assert/strict';
import test from 'node:test';
import { beginJournalRecord, readJournal, updateJournalRecord, walletFailureStatus } from '../lib/transaction-journal.ts';

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) };
}

const input = {
  fingerprint: `0x${'12'.repeat(32)}` as const,
  account: `0x${'11'.repeat(20)}` as const,
  chainId: 143 as const,
  marketAddress: `0x${'22'.repeat(20)}` as const,
  baseAmountAtoms: '200000000000000000000',
  minimumQuoteAtoms: '4800000',
};

test('journal writes before wallet and prevents duplicate active submissions', () => {
  const storage = memoryStorage();
  const record = beginJournalRecord(storage, input, new Date('2026-10-13T10:00:00Z'));
  assert.equal(readJournal(storage)[0]?.status, 'AWAITING_WALLET');
  assert.throws(() => beginJournalRecord(storage, input), /already awaiting/);
  updateJournalRecord(storage, record.id, { status: 'REJECTED', error: 'User rejected' });
  assert.doesNotThrow(() => beginJournalRecord(storage, input));
});

test('journal survives reload and persists transaction hashes', () => {
  const storage = memoryStorage();
  const record = beginJournalRecord(storage, input);
  updateJournalRecord(storage, record.id, { status: 'BROADCAST', hash: `0x${'ab'.repeat(32)}` });
  const reloaded = readJournal(storage);
  assert.equal(reloaded[0]?.status, 'BROADCAST');
  assert.equal(reloaded[0]?.hash, `0x${'ab'.repeat(32)}`);
});

test('wallet rejection is distinguished from unresolved failures', () => {
  assert.equal(walletFailureStatus({ code: 4001, message: 'Rejected' }), 'REJECTED');
  assert.equal(walletFailureStatus(new Error('RPC disconnected')), 'UNRESOLVED');
});

test('missing and reverted receipts remain distinct durable terminal evidence', () => {
  const storage = memoryStorage();
  const first = beginJournalRecord(storage, input);
  updateJournalRecord(storage, first.id, { status: 'UNRESOLVED', error: 'No receipt is currently available.' });
  const second = beginJournalRecord(storage, input);
  updateJournalRecord(storage, second.id, { status: 'REVERTED', hash: `0x${'cd'.repeat(32)}`, blockNumber: '123' });
  const records = readJournal(storage);
  assert.equal(records.find((record) => record.id === first.id)?.status, 'UNRESOLVED');
  assert.equal(records.find((record) => record.id === second.id)?.status, 'REVERTED');
});
