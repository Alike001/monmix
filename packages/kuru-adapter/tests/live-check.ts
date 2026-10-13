import assert from 'node:assert/strict';
import {
  createMonadPublicClient,
  MONAD_MAINNET_CHAIN_ID,
  readMarketSnapshot,
} from '../src/index.ts';

const client = createMonadPublicClient(process.env.MONAD_RPC_URL);
const snapshot = await readMarketSnapshot(client);

assert.equal(snapshot.chainId, MONAD_MAINNET_CHAIN_ID);
assert.ok(snapshot.book.blockNumber > 0n);
assert.ok(snapshot.params.pricePrecision > 0n);
assert.ok(snapshot.bestBidX18 > 0n);
assert.ok(snapshot.bestAskX18 >= snapshot.bestBidX18);

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
    },
    null,
    2,
  ),
);
