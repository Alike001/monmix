import assert from 'node:assert/strict';
import test from 'node:test';
import { assertBuyRevalidation, assertRevocationRevalidation, assertSellRevalidation } from '../lib/execution-review.ts';

const account = '0x1111111111111111111111111111111111111111' as const;
const marketAddress = '0x2222222222222222222222222222222222222222' as const;
const approvalSpender = marketAddress;

test('sell revalidation refuses lower output, higher gas and changed calldata', () => {
  const reviewed = { account, marketAddress, baseAmountAtoms: '200000000000000000000', sizeRaw: '2000000000000', minimumQuoteAtoms: '4800000', maximumGasCostWei: '30000000000000000' };
  assert.doesNotThrow(() => assertSellRevalidation(reviewed, { ...reviewed, minimumQuoteAtoms: '4810000', maximumGasCostWei: '29000000000000000' }));
  assert.throws(() => assertSellRevalidation(reviewed, { ...reviewed, minimumQuoteAtoms: '4799999' }), /output worsened/);
  assert.throws(() => assertSellRevalidation(reviewed, { ...reviewed, maximumGasCostWei: '30000000000000001' }), /gas ceiling increased/);
  assert.throws(() => assertSellRevalidation(reviewed, { ...reviewed, sizeRaw: '2000000000001' }), /transaction changed/);
});

test('approval revalidation preserves exact amount, spender and gas ceiling', () => {
  const reviewed = { account, marketAddress, approvalSpender, quoteAmountAtoms: '5000000', quoteSizeRaw: '500000000', minimumBaseAtoms: '200000000000000000000', approvalRequired: true, approvalAmountAtoms: '5000000', maximumApprovalGasCostWei: '9000000000000000', maximumBuyGasCostWei: null, exactBuySimulationPassed: false };
  assert.doesNotThrow(() => assertBuyRevalidation(reviewed, { ...reviewed, maximumApprovalGasCostWei: '8999999999999999' }));
  assert.throws(() => assertBuyRevalidation(reviewed, { ...reviewed, approvalAmountAtoms: '6000000' }), /approval requirement changed/);
  assert.throws(() => assertBuyRevalidation(reviewed, { ...reviewed, maximumApprovalGasCostWei: '9000000000000001' }), /gas ceiling increased/);
});

test('buy revalidation refuses lost allowance, lower output and higher gas', () => {
  const reviewed = { account, marketAddress, approvalSpender, quoteAmountAtoms: '5000000', quoteSizeRaw: '500000000', minimumBaseAtoms: '200000000000000000000', approvalRequired: false, approvalAmountAtoms: '0', maximumApprovalGasCostWei: '0', maximumBuyGasCostWei: '30000000000000000', exactBuySimulationPassed: true };
  assert.doesNotThrow(() => assertBuyRevalidation(reviewed, { ...reviewed, minimumBaseAtoms: '201000000000000000000', maximumBuyGasCostWei: '29000000000000000' }));
  assert.throws(() => assertBuyRevalidation(reviewed, { ...reviewed, approvalRequired: true, exactBuySimulationPassed: false, maximumBuyGasCostWei: null }), /no longer transaction-ready/);
  assert.throws(() => assertBuyRevalidation(reviewed, { ...reviewed, minimumBaseAtoms: '199999999999999999999' }), /output worsened/);
  assert.throws(() => assertBuyRevalidation(reviewed, { ...reviewed, maximumBuyGasCostWei: '30000000000000001' }), /gas ceiling increased/);
});

test('revocation revalidation requires the same live allowance and a non-increasing gas ceiling', () => {
  const reviewed = { account, tokenAddress: '0x3333333333333333333333333333333333333333' as const, spender: approvalSpender, allowanceAtoms: '5000000', targetAllowanceAtoms: '0', maximumGasCostWei: '9000000000000000' };
  assert.doesNotThrow(() => assertRevocationRevalidation(reviewed, { ...reviewed, maximumGasCostWei: '8000000000000000' }));
  assert.throws(() => assertRevocationRevalidation(reviewed, { ...reviewed, allowanceAtoms: '4000000' }), /allowance changed/);
  assert.throws(() => assertRevocationRevalidation(reviewed, { ...reviewed, maximumGasCostWei: '9000000000000001' }), /gas ceiling increased/);
});
