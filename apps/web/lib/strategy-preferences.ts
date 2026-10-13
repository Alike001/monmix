export const STRATEGY_PREFERENCES_KEY = 'strategy-desk:preferences:v2';
export const LEGACY_STRATEGY_PREFERENCES_KEY = 'strategy-desk:preferences:v1';

export type StrategyPresetId = 'balanced' | 'mon-forward' | 'usdc-buffer' | 'custom';

export interface StrategyPreferences {
  preset: StrategyPresetId;
  target: string;
  trigger: string;
  perActionCap: string;
  dailyCap: string;
  minimumTrade: string;
  paused: boolean;
}

export const DEFAULT_STRATEGY_PREFERENCES: StrategyPreferences = {
  preset: 'balanced',
  target: '50',
  trigger: '5',
  perActionCap: '15',
  dailyCap: '50',
  minimumTrade: '0.000001',
  paused: false,
};

export function readStrategyPreferences(storage: Pick<Storage, 'getItem'>): StrategyPreferences {
  try {
    const raw = storage.getItem(STRATEGY_PREFERENCES_KEY);
    if (!raw) return DEFAULT_STRATEGY_PREFERENCES;
    const value: unknown = JSON.parse(raw);
    if (!isPreferences(value)) return DEFAULT_STRATEGY_PREFERENCES;
    return value;
  } catch {
    return DEFAULT_STRATEGY_PREFERENCES;
  }
}

export function saveStrategyPreferences(storage: Pick<Storage, 'setItem'>, value: StrategyPreferences): void {
  storage.setItem(STRATEGY_PREFERENCES_KEY, JSON.stringify(value));
}

function isPreferences(value: unknown): value is StrategyPreferences {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<StrategyPreferences>;
  return ['target', 'trigger', 'perActionCap', 'dailyCap', 'minimumTrade'].every((key) =>
    typeof item[key as keyof StrategyPreferences] === 'string') &&
    ['balanced', 'mon-forward', 'usdc-buffer', 'custom'].includes(item.preset ?? '') &&
    typeof item.paused === 'boolean';
}
