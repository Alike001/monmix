import assert from 'node:assert/strict';
import {
  createMonadPublicClient,
  MONAD_MAINNET_CHAIN_ID,
  prepareNativeMarketSell,
  readMarketSnapshot,
  serializeNativeSellPreparation,
  verifyDeployedMarket,
} from '../src/index.ts';

const client = createMonadPublicClient(process.env.MONAD_RPC_URL, { timeout: 25_000, retryCount: 2 });
const snapshot = await readMarketSnapshot(client);

assert.equal(snapshot.chainId, MONAD_MAINNET_CHAIN_ID);
assert.ok(snapshot.book.blockNumber > 0n);
assert.ok(snapshot.params.pricePrecision > 0n);
assert.ok(snapshot.bestBidX18 > 0n);
assert.ok(snapshot.bestAskX18 >= snapshot.bestBidX18);
assert.equal(snapshot.params.minSize, 2_000_000_000_000n);

// Public eth_call only. This address is used solely as call context and no transaction is sent.
const simulationAccount = '0x000000000000000000000000000000000000dEaD';
const deployment = await verifyDeployedMarket(client);
const preparation = await prepareNativeMarketSell(client, {
  account: simulationAccount,
  baseAmountAtoms: 200n * 10n ** 18n,
  slippageBps: 50n,
});

console.log(
  JSON.stringify(
    {
      chainId: snapshot.chainId,
      market: snapshot.marketAddress,
      blockNumber: snapshot.book.blockNumber.toString(),
      pricePrecision: snapshot.params.pricePrecision.toString(),
      sizePrecision: snapshot.params.sizePrecision.toString(),
      bestBidX18: snapshot.bestBidX18.toString(),
      bestAskX18: snapshot.bestAskX18.toString(),
      status: snapshot.status,
      ageSeconds: snapshot.ageSeconds.toString(),
      minSizeRaw: snapshot.params.minSize.toString(),
      minimumMon: '200',
      implementation: deployment.implementation,
      implementationCodeHash: deployment.codeHash,
      nativeSellPreflight: serializeNativeSellPreparation(preparation),
    },
    null,
    2,
  ),
);
