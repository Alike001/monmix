import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRebalance, type PolicyInput } from '../src/policy.ts';
const A = 1_000_000n;
const baseline: PolicyInput = {
 baseValueQuoteAtoms: 60n*A, cashQuoteAtoms: 40n*A, targetBaseBps: 6000n,
 triggerDriftBps: 500n, perActionCapQuoteAtoms: 15n*A,
 dailyCapQuoteAtoms: 25n*A, usedTodayQuoteAtoms: 0n,
 minimumTradeQuoteAtoms: 1n*A, nowSeconds: 1000n,
 lastPriceUpdateSeconds: 990n, maxPriceAgeSeconds: 60n, paused:false
};
test('no trade when allocation matches target',()=>assert.deepEqual(evaluateRebalance(baseline),{status:'WAIT',code:'IN_BAND',driftBps:0n}));
test('proposes bounded buy when base falls below target',()=>{
 const r=evaluateRebalance({...baseline,baseValueQuoteAtoms:40n*A,cashQuoteAtoms:60n*A});
 assert.equal(r.status,'REVIEW'); if(r.status==='REVIEW'){assert.equal(r.side,'BUY_BASE');assert.equal(r.quoteNotional,15n*A)}
});
test('proposes bounded sell when base exceeds target',()=>{
 const r=evaluateRebalance({...baseline,baseValueQuoteAtoms:80n*A,cashQuoteAtoms:20n*A});
 assert.equal(r.status,'REVIEW'); if(r.status==='REVIEW'){assert.equal(r.side,'SELL_BASE');assert.equal(r.quoteNotional,15n*A)}
});
test('blocks stale prices',()=>assert.equal(evaluateRebalance({...baseline,lastPriceUpdateSeconds:800n}).status,'BLOCK'));
test('blocks paused strategies',()=>assert.deepEqual(evaluateRebalance({...baseline,paused:true}),{status:'BLOCK',code:'PAUSED',driftBps:0n}));
test('blocks expired daily budget',()=>assert.equal(evaluateRebalance({...baseline,baseValueQuoteAtoms:40n*A,cashQuoteAtoms:60n*A,usedTodayQuoteAtoms:25n*A}).status,'BLOCK'));
test('enforces minimum order size',()=>assert.equal(evaluateRebalance({...baseline,baseValueQuoteAtoms:40n*A,cashQuoteAtoms:60n*A,perActionCapQuoteAtoms:100_000n}).status,'BLOCK'));
test('rejects impossible allocation',()=>assert.throws(()=>evaluateRebalance({...baseline,targetBaseBps:10001n}),RangeError));
test('rejects future price timestamp',()=>assert.throws(()=>evaluateRebalance({...baseline,lastPriceUpdateSeconds:1001n}),RangeError));
test('proposed buy never exceeds cash',()=>{
 const r=evaluateRebalance({...baseline,baseValueQuoteAtoms:2n*A,cashQuoteAtoms:3n*A,targetBaseBps:9000n});
 assert.equal(r.status,'REVIEW');if(r.status==='REVIEW'){assert.ok(r.quoteNotional<=3n*A);assert.equal(r.quoteNotional,2_500_000n);}
});

test('bounded decision invariants across 1000 deterministic portfolio snapshots',()=>{
 let seed=716_291_321n;
 const rand=(limit: bigint)=>{seed=(seed*1103515245n+12345n)%2147483648n;return seed%limit;};
 for(let i=0;i<1000;i++){
  const base=rand(1_000n)*A, cash=rand(1_000n)*A;
  const perAction=(1n+rand(1000n))*A, daily=(1n+rand(1000n))*A, used=rand(1000n)*A;
  const p:PolicyInput={...baseline,baseValueQuoteAtoms:base,cashQuoteAtoms:cash,
   targetBaseBps:rand(10001n),triggerDriftBps:rand(500n),
   perActionCapQuoteAtoms:perAction,dailyCapQuoteAtoms:daily,usedTodayQuoteAtoms:used,
   minimumTradeQuoteAtoms:1n};
  const r=evaluateRebalance(p);
  if(r.status==='REVIEW'){
    assert.ok(r.quoteNotional>0n);
    assert.ok(r.quoteNotional<=perAction);
    assert.ok(r.quoteNotional<=daily-used);
    assert.ok(r.quoteNotional<=(r.side==='BUY_BASE'?cash:base));
  }
 }
});
