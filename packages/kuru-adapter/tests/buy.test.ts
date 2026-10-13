import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeAbiParameters, encodeEventTopics, parseAbiParameters, type Address, type Log } from 'viem';
import { ERC20_APPROVAL_ABI, estimatedBuyPriceImpactBps, hasExactApprovalEvent, normalizeQuoteAtomsToPriceRaw, PreflightError, USDC_ADDRESS } from '../src/index.ts';

test('USDC atoms normalize exactly into Kuru price-precision quote units', () => {
  const result = normalizeQuoteAtomsToPriceRaw(4_840_001n, 100_000_000n, 6n);
  assert.equal(result.quoteSizeRaw, 484_000_100n);
  assert.equal(result.normalizedQuoteAtoms, 4_840_001n);
  assert.throws(() => normalizeQuoteAtomsToPriceRaw(0n, 100_000_000n, 6n), (error: unknown) => error instanceof PreflightError);
});

test('buy price impact compares simulated average with the live ask using bigint math', () => {
  const base = 200n * 10n ** 18n;
  assert.equal(estimatedBuyPriceImpactBps(4_800_000n, base, 24_000_000_000_000_000n), 0n);
  assert.equal(estimatedBuyPriceImpactBps(4_848_000n, base, 24_000_000_000_000_000n), 100n);
});

test('direct buy precision accepts quote amounts below the declared base minimum without pretending they are eligible', () => {
  const tiny = normalizeQuoteAtomsToPriceRaw(1n, 100_000_000n, 6n);
  assert.equal(tiny.quoteSizeRaw, 100n);
  assert.equal(tiny.normalizedQuoteAtoms, 1n);
  // Eligibility is checked against simulated base output in prepareNativeMarketBuy, not inferred from quote units.
});

test('approval evidence requires the configured USDC, exact owner, spender and amount', () => {
  const owner = `0x${'11'.repeat(20)}` as Address;
  const spender = `0x${'22'.repeat(20)}` as Address;
  const amount = 5_000_000n;
  const topics = encodeEventTopics({ abi: ERC20_APPROVAL_ABI, eventName: 'Approval', args: { owner, spender } });
  const log = { address: USDC_ADDRESS, topics, data: encodeAbiParameters(parseAbiParameters('uint256'), [amount]) } as Log;
  assert.equal(hasExactApprovalEvent([log], owner, spender, amount), true);
  assert.equal(hasExactApprovalEvent([log], owner, spender, amount + 1n), false);
  assert.equal(hasExactApprovalEvent([{ ...log, address: spender }], owner, spender, amount), false);
});
