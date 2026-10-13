import assert from 'node:assert/strict';
import test from 'node:test';
import type { PublicClient } from 'viem';
import { KURU_MON_USDC_MARKET, simulateUsdcAllowanceRevocation, USDC_ADDRESS } from '../src/index.ts';

test('allowance revocation simulates and estimates approve(market, zero)', async () => {
  const calls: Array<{ address: string; functionName: string; args: readonly unknown[] }> = [];
  const client = {
    simulateContract: async (call: { address: string; functionName: string; args: readonly unknown[] }) => { calls.push(call); return { result: true }; },
    estimateContractGas: async (call: { address: string; functionName: string; args: readonly unknown[] }) => { calls.push(call); return 50_000n; },
    getGasPrice: async () => 100n,
  } as unknown as PublicClient;
  const result = await simulateUsdcAllowanceRevocation(client, '0x1111111111111111111111111111111111111111');
  assert.deepEqual(result, { gasEstimate: 50_000n, gasPriceWei: 100n });
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.address, USDC_ADDRESS);
  assert.equal(calls[0]?.functionName, 'approve');
  assert.deepEqual(calls[0]?.args, [KURU_MON_USDC_MARKET, 0n]);
});
