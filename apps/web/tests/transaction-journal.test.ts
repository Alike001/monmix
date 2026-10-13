import assert from 'node:assert/strict';
import test from 'node:test';
import { beginJournalRecord, isProtectedTradeOutcome, portfolioAllocationBps, readJournal, recordPreparedAction, updateJournalRecord, walletFailureStatus } from '../lib/transaction-journal.ts';

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
  assert.throws(() => beginJournalRecord(storage, input), /already has an action/);
  updateJournalRecord(storage, record.id, { status: 'REJECTED', error: 'User rejected' });
  assert.doesNotThrow(() => beginJournalRecord(storage, input));
});

test('journal serializes an account even when a newer block changes the fingerprint', () => {
  const storage = memoryStorage();
  beginJournalRecord(storage, input);
  assert.throws(() => beginJournalRecord(storage, { ...input, fingerprint: `0x${'34'.repeat(32)}` }), /already has an action/);
});

test('malformed persisted addresses are discarded before duplicate checks', () => {
  const storage = memoryStorage();
  storage.setItem('strategy-desk:transaction-journal:v1', JSON.stringify([{ ...input, id: 'tampered', status: 'BROADCAST', account: 'not-an-address', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]));
  assert.deepEqual(readJournal(storage), []);
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

test('prepared buy evidence is durable without pretending a wallet request occurred', () => {
  const storage = memoryStorage();
  const prepared = recordPreparedAction(storage, {
    ...input,
    action: 'BUY_MON',
    quoteAmountAtoms: '5000000',
    expectedBaseAtoms: '204000000000000000000',
    minimumBaseAtoms: '202980000000000000000',
  }, new Date('2026-10-13T10:00:00Z'));
  assert.equal(prepared.status, 'PREPARED');
  assert.equal(readJournal(storage)[0]?.action, 'BUY_MON');
  assert.doesNotThrow(() => beginJournalRecord(storage, { ...input, action: 'BUY_MON', quoteAmountAtoms: '5000000' }));
});

test('exact approval and buy attempts remain separate journal actions', () => {
  const storage = memoryStorage();
  const approval = beginJournalRecord(storage, {
    ...input,
    action: 'APPROVE_USDC',
    baseAmountAtoms: '0',
    minimumQuoteAtoms: '0',
    approvalAmountAtoms: '5000000',
    approvalSpender: input.marketAddress,
  });
  updateJournalRecord(storage, approval.id, { status: 'CONFIRMED' });
  const buy = beginJournalRecord(storage, { ...input, action: 'BUY_MON', quoteAmountAtoms: '5000000' });
  assert.equal(readJournal(storage).find((record) => record.id === approval.id)?.action, 'APPROVE_USDC');
  assert.equal(buy.action, 'BUY_MON');
});

test('journal preserves verified received amount and before/after wallet evidence', () => {
  const storage = memoryStorage();
  const record = beginJournalRecord(storage, { ...input, expectedQuoteAtoms: '4838400', beforeMonAtoms: '1000000000000000000000', beforeUsdcAtoms: '473753' });
  updateJournalRecord(storage, record.id, { status: 'CONFIRMED', receivedQuoteAtoms: '4838400', afterMonAtoms: '799900000000000000000', afterUsdcAtoms: '5312153' });
  const restored = readJournal(storage)[0];
  assert.equal(restored?.receivedQuoteAtoms, '4838400');
  assert.equal(restored?.afterUsdcAtoms, '5312153');
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

test('portfolio allocation uses bigint atoms and rounds down deterministically', () => {
  assert.equal(portfolioAllocationBps(200n * 10n ** 18n, 5_000_000n, 25_000_000_000_000_000n), 5_000n);
  assert.equal(portfolioAllocationBps(0n, 0n, 25_000_000_000_000_000n), 0n);
});

test('receipt outcome proof requires protected output and the full sell size', () => {
  assert.equal(isProtectedTradeOutcome({ buying: false, filledSizeRaw: 2_000n, requestedSizeRaw: 2_000n, receivedAtoms: 4_800_000n, minimumReceivedAtoms: 4_776_000n }), true);
  assert.equal(isProtectedTradeOutcome({ buying: false, filledSizeRaw: 1_999n, requestedSizeRaw: 2_000n, receivedAtoms: 4_800_000n, minimumReceivedAtoms: 4_776_000n }), false);
  assert.equal(isProtectedTradeOutcome({ buying: true, filledSizeRaw: 2_000n, receivedAtoms: 199n, minimumReceivedAtoms: 200n }), false);
  assert.equal(isProtectedTradeOutcome({ buying: true, filledSizeRaw: 2_000n, receivedAtoms: 200n, minimumReceivedAtoms: 200n }), true);
});
