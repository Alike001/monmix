import type { StrategyPresetId } from './strategy-preferences';

export interface AllocationPreset {
  id: Exclude<StrategyPresetId, 'custom'>;
  name: string;
  description: string;
  monPercent: string;
}

export const ALLOCATION_PRESETS: readonly AllocationPreset[] = [
  { id: 'balanced', name: 'Balanced', description: 'An even MON and USDC split.', monPercent: '50' },
  { id: 'mon-forward', name: 'MON forward', description: 'More exposure to MON price movement.', monPercent: '70' },
  { id: 'usdc-buffer', name: 'USDC buffer', description: 'More stable-value balance on hand.', monPercent: '30' },
] as const;

export function presetForTarget(target: string): StrategyPresetId {
  return ALLOCATION_PRESETS.find((preset) => preset.monPercent === target)?.id ?? 'custom';
}

export function allocationBps(baseValueQuoteAtoms: bigint, cashQuoteAtoms: bigint): bigint {
  if (baseValueQuoteAtoms < 0n || cashQuoteAtoms < 0n) throw new RangeError('Portfolio values cannot be negative');
  const total = baseValueQuoteAtoms + cashQuoteAtoms;
  return total === 0n ? 0n : (baseValueQuoteAtoms * 10_000n) / total;
}

export function marketMinimumQuoteAtoms(minimumBaseAtoms: bigint, midpointX18: bigint): bigint {
  if (minimumBaseAtoms < 0n || midpointX18 < 0n) throw new RangeError('Market minimum inputs cannot be negative');
  return (minimumBaseAtoms * midpointX18 * 1_000_000n) / (10n ** 18n * 10n ** 18n);
}

export type QuoteFreshness = 'FRESH' | 'EXPIRING' | 'EXPIRED';

export function quoteFreshness(expiresAtSeconds: bigint, nowSeconds: bigint): QuoteFreshness {
  const remaining = expiresAtSeconds - nowSeconds;
  if (remaining <= 0n) return 'EXPIRED';
  if (remaining <= 5n) return 'EXPIRING';
  return 'FRESH';
}
