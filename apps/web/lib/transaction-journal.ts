import { getAddress, isAddress, type Address, type Hex } from 'viem';

export const JOURNAL_STORAGE_KEY = 'strategy-desk:transaction-journal:v1';

export type JournalStatus =
  | 'PREPARED'
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
  action?: 'SELL_MON' | 'BUY_MON' | 'APPROVE_USDC' | 'REVOKE_USDC';
  baseAmountAtoms: string;
  sizeRaw?: string;
  minimumQuoteAtoms: string;
  expectedQuoteAtoms?: string;
  beforeMonAtoms?: string;
  beforeUsdcAtoms?: string;
  afterMonAtoms?: string;
  afterUsdcAtoms?: string;
  receivedQuoteAtoms?: string;
  receivedBaseAtoms?: string;
  networkFeeWei?: string;
  quoteAmountAtoms?: string;
  quoteSizeRaw?: string;
  expectedBaseAtoms?: string;
  minimumBaseAtoms?: string;
  approvalAmountAtoms?: string;
  approvalSpender?: Address;
  reconciledAt?: string;
  beforeAllocationBps?: string;
  afterAllocationBps?: string;
  valuationPriceX18?: string;
  createdAt: string;
  updatedAt: string;
  hash?: Hex;
  blockNumber?: string;
  filledSizeRaw?: string;
  error?: string;
}

export function recordPreparedAction(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  input: Omit<JournalRecord, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
  now = new Date(),
): JournalRecord {
  const records = readJournal(storage);
  const timestamp = now.toISOString();
  const existing = records.find((record) => record.fingerprint === input.fingerprint && record.status === 'PREPARED');
  if (existing) return updateJournalRecord(storage, existing.id, input, now);
  const record: JournalRecord = { ...input, id: `${input.fingerprint}:prepared`, status: 'PREPARED', createdAt: timestamp, updatedAt: timestamp };
  writeJournal(storage, [record, ...records]);
  return record;
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
  if (records.some((record) => getAddress(record.account) === getAddress(input.account) &&
    getAddress(record.marketAddress) === getAddress(input.marketAddress) &&
    ['AWAITING_WALLET', 'BROADCAST'].includes(record.status))) {
    throw new Error('This account already has an action awaiting the wallet or chain. Reconcile it before starting another.');
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
    typeof record.status === 'string' && typeof record.account === 'string' && isAddress(record.account) && record.chainId === 143 &&
    typeof record.marketAddress === 'string' && isAddress(record.marketAddress) && typeof record.baseAmountAtoms === 'string' &&
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

export function portfolioAllocationBps(monAtoms: bigint, usdcAtoms: bigint, priceX18: bigint): bigint {
  const monValueUsdcAtoms = (monAtoms * priceX18 * 1_000_000n) / (10n ** 18n * 10n ** 18n);
  const total = monValueUsdcAtoms + usdcAtoms;
  return total === 0n ? 0n : (monValueUsdcAtoms * 10_000n) / total;
}

export function isProtectedTradeOutcome(input: {
  buying: boolean;
  filledSizeRaw: bigint;
  requestedSizeRaw?: bigint | undefined;
  receivedAtoms?: bigint | undefined;
  minimumReceivedAtoms: bigint;
}): boolean {
  if (input.filledSizeRaw <= 0n || input.receivedAtoms === undefined || input.receivedAtoms < input.minimumReceivedAtoms) return false;
  return input.buying || input.requestedSizeRaw === undefined || input.filledSizeRaw === input.requestedSizeRaw;
}
