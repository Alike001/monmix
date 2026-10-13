import { evaluateRebalance } from './policy.ts';
const result = evaluateRebalance({
  baseValueQuoteAtoms:40_000_000n,cashQuoteAtoms:60_000_000n,
  targetBaseBps:6000n,triggerDriftBps:500n,
  perActionCapQuoteAtoms:15_000_000n,dailyCapQuoteAtoms:25_000_000n,
  usedTodayQuoteAtoms:0n,minimumTradeQuoteAtoms:1_000_000n,
  nowSeconds:1000n,lastPriceUpdateSeconds:990n,maxPriceAgeSeconds:60n,
  paused:false
});
console.log(JSON.stringify(result,(_,v)=>typeof v==='bigint'?v.toString():v,2));
