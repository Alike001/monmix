import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeEventTopics, encodeAbiParameters, getAddress, pad, type Log, type PublicClient } from 'viem';
import {
  KURU_DIRECT_ORDER_ABI,
  KURU_MON_USDC_MARKET,
  PreflightError,
  assertDeclaredOrderSize,
  decodeKuruTrades,
  minimumOutputAfterSlippage,
  normalizeBaseAtomsToSizeRaw,
  simulateProtectedNativeSell,
  verifyDeployedMarket,
  KURU_MON_USDC_IMPLEMENTATION,
  estimatedSellPriceImpactBps,
} from '../src/index.ts';

test('declared 200 MON minimum is normalized in size precision, not token atoms', () => {
  const below = normalizeBaseAtomsToSizeRaw(199_999_999_999_999_999_999n, 10_000_000_000n, 18n);
  const boundary = normalizeBaseAtomsToSizeRaw(200_000_000_000_000_000_000n, 10_000_000_000n, 18n);
  assert.equal(below.sizeRaw, 1_999_999_999_999n);
  assert.equal(boundary.sizeRaw, 2_000_000_000_000n);
  assert.throws(() => assertDeclaredOrderSize(below.sizeRaw, 2_000_000_000_000n, 2_000_000_000_000_000_000n),
    (error: unknown) => error instanceof PreflightError && error.code === 'BELOW_MARKET_MINIMUM');
  assert.doesNotThrow(() => assertDeclaredOrderSize(boundary.sizeRaw, 2_000_000_000_000n, 2_000_000_000_000_000_000n));
});

test('base conversion rounds down to the exact payable MON amount', () => {
  const normalized = normalizeBaseAtomsToSizeRaw(200_000_000_000_099_999_999n, 10_000_000_000n, 18n);
  assert.equal(normalized.sizeRaw, 2_000_000_000_000n);
  assert.equal(normalized.normalizedBaseAtoms, 200_000_000_000_000_000_000n);
});

test('slippage bound rounds down in quote-token atoms', () => {
  assert.equal(minimumOutputAfterSlippage(4_856_400n, 50n), 4_832_118n);
  assert.throws(() => minimumOutputAfterSlippage(4_856_400n, 1_001n),
    (error: unknown) => error instanceof PreflightError && error.code === 'INVALID_AMOUNT');
});

test('slippage floor never rounds above the simulated output', () => {
  assert.equal(minimumOutputAfterSlippage(1n, 50n), 0n);
  assert.equal(minimumOutputAfterSlippage(4_800_001n, 50n), 4_776_000n);
});

test('price impact compares the simulated average with the live best bid using bigint math', () => {
  assert.equal(estimatedSellPriceImpactBps(4_800_000n, 200n * 10n ** 18n, 24_000_000_000_000_000n), 0n);
  assert.equal(estimatedSellPriceImpactBps(4_752_000n, 200n * 10n ** 18n, 24_000_000_000_000_000n), 100n);
  assert.throws(() => estimatedSellPriceImpactBps(0n, 1n, 1n));
});

test('Trade decoding accepts only the configured market and expected taker', () => {
  const taker = getAddress('0x000000000000000000000000000000000000dEaD');
  const topics = encodeEventTopics({ abi: KURU_DIRECT_ORDER_ABI, eventName: 'Trade' });
  const data = encodeAbiParameters([
    { type: 'uint40' }, { type: 'address' }, { type: 'bool' }, { type: 'uint256' },
    { type: 'uint96' }, { type: 'address' }, { type: 'address' }, { type: 'uint96' },
  ], [7, '0x1111111111111111111111111111111111111111', false, 2_430_000n, 0n, taker, taker, 2_000_000_000_000n]);
  const log = { address: KURU_MON_USDC_MARKET, data, topics } as Log;
  const decoded = decodeKuruTrades([log], taker);
  assert.equal(decoded.length, 1);
  assert.equal(decoded[0]?.filledSizeRaw, 2_000_000_000_000n);
  assert.equal(decodeKuruTrades([log], '0x2222222222222222222222222222222222222222').length, 0);
});

test('deployment verification refuses wrong chain and changed proxy implementation', async () => {
  await assert.rejects(() => verifyDeployedMarket({ getChainId: async () => 1 } as unknown as PublicClient),
    (error: unknown) => error instanceof PreflightError && error.code === 'WRONG_CHAIN');
  const changed = {
    getChainId: async () => 143,
    getStorageAt: async () => pad('0x2222222222222222222222222222222222222222', { size: 32 }),
  } as unknown as PublicClient;
  await assert.rejects(() => verifyDeployedMarket(changed),
    (error: unknown) => error instanceof PreflightError && error.code === 'MARKET_CHANGED');
  const codeChanged = {
    getChainId: async () => 143,
    getStorageAt: async () => pad(KURU_MON_USDC_IMPLEMENTATION, { size: 32 }),
    getBytecode: async () => '0x00',
  } as unknown as PublicClient;
  await assert.rejects(() => verifyDeployedMarket(codeChanged),
    (error: unknown) => error instanceof PreflightError && error.code === 'MARKET_CHANGED');
});

test('protected sell always simulates fill-or-kill twice and surfaces simulation failure', async () => {
  const recorded: unknown[][] = [];
  const client = {
    simulateContract: async ({ args }: { args: readonly unknown[] }) => {
      recorded.push([...args]);
      if (recorded.length === 1) return { result: 4_856_400n };
      return { result: 4_856_400n };
    },
    estimateContractGas: async () => 280_000n,
    getGasPrice: async () => 52_000_000_000n,
  } as unknown as PublicClient;
  const result = await simulateProtectedNativeSell(client, {
    account: '0x000000000000000000000000000000000000dEaD',
    sizeRaw: 2_000_000_000_000n,
    baseAmountAtoms: 200n * 10n ** 18n,
    slippageBps: 50n,
  });
  assert.equal(result.minimumQuoteAtoms, 4_832_118n);
  assert.deepEqual(recorded[0], [2_000_000_000_000n, 0n, false, true]);
  assert.deepEqual(recorded[1], [2_000_000_000_000n, 4_832_118n, false, true]);

  const failed = { simulateContract: async () => { throw new Error('execution reverted'); } } as unknown as PublicClient;
  await assert.rejects(() => simulateProtectedNativeSell(failed, {
    account: '0x000000000000000000000000000000000000dEaD', sizeRaw: 2_000_000_000_000n,
    baseAmountAtoms: 200n * 10n ** 18n, slippageBps: 50n,
  }), (error: unknown) => error instanceof PreflightError && error.code === 'SIMULATION_FAILED');
});
