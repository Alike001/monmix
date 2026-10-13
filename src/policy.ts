/**
 * Deterministic decision gate for a MON / stablecoin portfolio.
 * All monetary inputs are already valued in 6-decimal quote atoms.
 * No balances, prices or permissions are inferred from this module.
 * This is an execution PRE-FLIGHT only; a separate, audited onchain control is
 * mandatory before unattended signing or movement of user funds.
 */
export type ProposedAction =
  | { status: 'WAIT'; code: 'NO_CAPITAL' | 'IN_BAND'; driftBps: bigint }
  | { status: 'BLOCK'; code: 'PAUSED' | 'STALE_PRICE' | 'NO_BUDGET' | 'INSUFFICIENT_ASSET' | 'BELOW_MINIMUM'; driftBps: bigint }
  | { status: 'REVIEW'; side: 'BUY_BASE' | 'SELL_BASE'; quoteNotional: bigint; driftBps: bigint; reason: string };

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

const BPS = 10000n;
const min = (...x: bigint[]): bigint => x.reduce((a,b)=>a<b?a:b);
const absolute = (x: bigint): bigint => x>=0n?x:-x;

export function evaluateRebalance(p: PolicyInput): ProposedAction {
  const nonnegative: bigint[] = [p.baseValueQuoteAtoms,p.cashQuoteAtoms,p.targetBaseBps,p.triggerDriftBps,p.perActionCapQuoteAtoms,p.dailyCapQuoteAtoms,p.usedTodayQuoteAtoms,p.minimumTradeQuoteAtoms,p.nowSeconds,p.lastPriceUpdateSeconds,p.maxPriceAgeSeconds];
  if(nonnegative.some(x=>x<0n)||p.targetBaseBps>BPS||p.triggerDriftBps>BPS||p.minimumTradeQuoteAtoms===0n) throw new RangeError('Invalid policy input');
  if (p.lastPriceUpdateSeconds>p.nowSeconds) throw new RangeError('Price timestamp in the future');
  const total = p.baseValueQuoteAtoms+p.cashQuoteAtoms;
  if (p.paused) return {status:'BLOCK',code:'PAUSED',driftBps:0n};
  if(p.nowSeconds-p.lastPriceUpdateSeconds>p.maxPriceAgeSeconds) return {status:'BLOCK',code:'STALE_PRICE',driftBps:0n};
  if(total===0n) return {status:'WAIT',code:'NO_CAPITAL',driftBps:0n};
  const targetBase = total*p.targetBaseBps/BPS;
  const imbalance = targetBase-p.baseValueQuoteAtoms;
  const driftBps = absolute(imbalance)*BPS/total;
  if(driftBps<p.triggerDriftBps||imbalance===0n) return {status:'WAIT',code:'IN_BAND',driftBps};
  const remainingDaily = p.dailyCapQuoteAtoms>p.usedTodayQuoteAtoms?p.dailyCapQuoteAtoms-p.usedTodayQuoteAtoms:0n;
  if(remainingDaily===0n||p.perActionCapQuoteAtoms===0n) return {status:'BLOCK',code:'NO_BUDGET',driftBps};
  const buying = imbalance>0n;
  const sourceCapacity = buying?p.cashQuoteAtoms:p.baseValueQuoteAtoms;
  if(sourceCapacity===0n) return {status:'BLOCK',code:'INSUFFICIENT_ASSET',driftBps};
  const quoteNotional = min(absolute(imbalance),remainingDaily,p.perActionCapQuoteAtoms,sourceCapacity);
  if(quoteNotional<p.minimumTradeQuoteAtoms) return {status:'BLOCK',code:'BELOW_MINIMUM',driftBps};
  const side = buying?'BUY_BASE':'SELL_BASE';
  return {status:'REVIEW',side,quoteNotional,driftBps,reason:`Target allocation drifted ${driftBps} basis points; proposed ${side.toLowerCase()} within the configured per-action and daily budgets.`};
}
