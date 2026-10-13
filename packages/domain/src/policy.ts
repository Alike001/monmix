/**
 * Deterministic decision gate for a MON / stablecoin portfolio.
 * All monetary inputs are already valued in quote-token atomic units.
 *
 * This module is advisory. REVIEW means "show this to the owner"; it is not
 * an authorization, signer, or independently enforced financial limit.
 */
export type ProposedAction =
  | { status: 'WAIT'; code: 'NO_CAPITAL' | 'IN_BAND'; driftBps: bigint }
  | {
      status: 'BLOCK';
      code:
        | 'PAUSED'
        | 'STALE_PRICE'
        | 'NO_BUDGET'
        | 'INSUFFICIENT_ASSET'
        | 'BELOW_MINIMUM';
      driftBps: bigint;
    }
  | {
      status: 'REVIEW';
      side: 'BUY_BASE' | 'SELL_BASE';
      quoteNotional: bigint;
      driftBps: bigint;
      reason: string;
    };

export interface PolicyInput {
  baseValueQuoteAtoms: bigint;
  cashQuoteAtoms: bigint;
  targetBaseBps: bigint;
  triggerDriftBps: bigint;
  perActionCapQuoteAtoms: bigint;
  dailyCapQuoteAtoms: bigint;
  usedTodayQuoteAtoms: bigint;
  minimumTradeQuoteAtoms: bigint;
  nowSeconds: bigint;
  lastPriceUpdateSeconds: bigint;
  maxPriceAgeSeconds: bigint;
  paused: boolean;
}

const BPS = 10_000n;
const min = (...values: bigint[]): bigint =>
  values.reduce((left, right) => (left < right ? left : right));
const absolute = (value: bigint): bigint => (value >= 0n ? value : -value);

export function evaluateRebalance(policy: PolicyInput): ProposedAction {
  const nonnegative: bigint[] = [
    policy.baseValueQuoteAtoms,
    policy.cashQuoteAtoms,
    policy.targetBaseBps,
    policy.triggerDriftBps,
    policy.perActionCapQuoteAtoms,
    policy.dailyCapQuoteAtoms,
    policy.usedTodayQuoteAtoms,
    policy.minimumTradeQuoteAtoms,
    policy.nowSeconds,
    policy.lastPriceUpdateSeconds,
    policy.maxPriceAgeSeconds,
  ];

  if (
    nonnegative.some((value) => value < 0n) ||
    policy.targetBaseBps > BPS ||
    policy.triggerDriftBps > BPS ||
    policy.minimumTradeQuoteAtoms === 0n
  ) {
    throw new RangeError('Invalid policy input');
  }
  if (policy.lastPriceUpdateSeconds > policy.nowSeconds) {
    throw new RangeError('Price timestamp in the future');
  }

  const total = policy.baseValueQuoteAtoms + policy.cashQuoteAtoms;
  if (policy.paused) return { status: 'BLOCK', code: 'PAUSED', driftBps: 0n };
  if (policy.nowSeconds - policy.lastPriceUpdateSeconds > policy.maxPriceAgeSeconds) {
    return { status: 'BLOCK', code: 'STALE_PRICE', driftBps: 0n };
  }
  if (total === 0n) return { status: 'WAIT', code: 'NO_CAPITAL', driftBps: 0n };

  const targetBase = (total * policy.targetBaseBps) / BPS;
  const imbalance = targetBase - policy.baseValueQuoteAtoms;
  const driftBps = (absolute(imbalance) * BPS) / total;
  if (driftBps < policy.triggerDriftBps || imbalance === 0n) {
    return { status: 'WAIT', code: 'IN_BAND', driftBps };
  }

  const remainingDaily =
    policy.dailyCapQuoteAtoms > policy.usedTodayQuoteAtoms
      ? policy.dailyCapQuoteAtoms - policy.usedTodayQuoteAtoms
      : 0n;
  if (remainingDaily === 0n || policy.perActionCapQuoteAtoms === 0n) {
    return { status: 'BLOCK', code: 'NO_BUDGET', driftBps };
  }

  const buying = imbalance > 0n;
  const sourceCapacity = buying ? policy.cashQuoteAtoms : policy.baseValueQuoteAtoms;
  if (sourceCapacity === 0n) {
    return { status: 'BLOCK', code: 'INSUFFICIENT_ASSET', driftBps };
  }

  const quoteNotional = min(
    absolute(imbalance),
    remainingDaily,
    policy.perActionCapQuoteAtoms,
    sourceCapacity,
  );
  if (quoteNotional < policy.minimumTradeQuoteAtoms) {
    return { status: 'BLOCK', code: 'BELOW_MINIMUM', driftBps };
  }

  const side = buying ? 'BUY_BASE' : 'SELL_BASE';
  return {
    status: 'REVIEW',
    side,
    quoteNotional,
    driftBps,
    reason: `Target allocation drifted ${driftBps} basis points; proposed ${side.toLowerCase()} within the configured advisory budgets.`,
  };
}
