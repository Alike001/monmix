import type { Address, Hex } from 'viem';

export const JOURNAL_STORAGE_KEY = 'strategy-desk:transaction-journal:v1';

export type JournalStatus =
  | 'AWAITING_WALLET'
  | 'REJECTED'
  | 'BROADCAST'
  | 'CONFIRMED'
  | 'REVERTED'
  | 'UNRESOLVED';

export interface JournalRecord {
  id: string;
  fingerprint: Hex;
  status: JournalStatus;
  account: Address;
  chainId: 143;
  marketAddress: Address;
  baseAmountAtoms: string;
  minimumQuoteAtoms: string;
  createdAt: string;
  updatedAt: string;
  hash?: Hex;
  blockNumber?: string;
  filledSizeRaw?: string;
  error?: string;
}

export function readJournal(storage: Pick<Storage, 'getItem'>): JournalRecord[] {
  try {
    const raw = storage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isJournalRecord) : [];
  } catch {
    return [];
  }
}

export function writeJournal(storage: Pick<Storage, 'setItem'>, records: JournalRecord[]): void {
  storage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(records.slice(0, 100)));
}

export function beginJournalRecord(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  input: Omit<JournalRecord, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
  now = new Date(),
): JournalRecord {
  const records = readJournal(storage);
  if (records.some((record) => record.fingerprint === input.fingerprint && ['AWAITING_WALLET', 'BROADCAST'].includes(record.status))) {
    throw new Error('This exact action is already awaiting the wallet or chain.');
  }
  const timestamp = now.toISOString();
  const record: JournalRecord = {
    ...input,
    id: `${input.fingerprint}:${now.getTime()}:${crypto.randomUUID()}`,
    status: 'AWAITING_WALLET',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  writeJournal(storage, [record, ...records]);
  return record;
}

export function updateJournalRecord(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  id: string,
  patch: Partial<Omit<JournalRecord, 'id' | 'createdAt'>>,
  now = new Date(),
): JournalRecord {
  const records = readJournal(storage);
  const existing = records.find((record) => record.id === id);
  if (!existing) throw new Error('Transaction journal record was not found.');
  const updated = { ...existing, ...patch, updatedAt: now.toISOString() };
  writeJournal(storage, records.map((record) => record.id === id ? updated : record));
  return updated;
}

function isJournalRecord(value: unknown): value is JournalRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<JournalRecord>;
  return typeof record.id === 'string' && typeof record.fingerprint === 'string' &&
    typeof record.status === 'string' && typeof record.account === 'string' && record.chainId === 143 &&
    typeof record.marketAddress === 'string' && typeof record.baseAmountAtoms === 'string' &&
    typeof record.minimumQuoteAtoms === 'string' && typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string';
}

export function walletFailureStatus(error: unknown): 'REJECTED' | 'UNRESOLVED' {
  const candidate = error as { code?: number; name?: string; message?: string };
  const text = `${candidate.name ?? ''} ${candidate.message ?? ''}`.toLowerCase();
  return candidate.code === 4001 || text.includes('user rejected') || text.includes('user denied')
    ? 'REJECTED'
    : 'UNRESOLVED';
}
