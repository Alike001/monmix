export const STRATEGY_PREFERENCES_KEY = 'strategy-desk:preferences:v1';

export interface StrategyPreferences {
  target: string;
  trigger: string;
  perActionCap: string;
  dailyCap: string;
  minimumTrade: string;
  paused: boolean;
}

export const DEFAULT_STRATEGY_PREFERENCES: StrategyPreferences = {
  target: '60',
  trigger: '5',
  perActionCap: '15',
  dailyCap: '25',
  minimumTrade: '5',
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
    typeof item[key as keyof StrategyPreferences] === 'string') && typeof item.paused === 'boolean';
}
