# Judge quickstart

## Understand it in 30 seconds

**MonMix — Your crypto, your mix.**

MonMix helps you keep your MON and USDC holdings aligned with your goals. Choose your target allocation, see when your portfolio drifts, and review protected trades through Kuru to rebalance—all while keeping control of your wallet.

## Review path

1. Open `/markets` to see the verified Monad chain, Kuru market, live spread/depth, freshness and 200 MON venue floor.
2. Open `/desk`, connect a MetaMask-compatible wallet on chain 143 and choose an allocation preset or custom target.
3. Read current versus target allocation and the deterministic explanation.
4. For an eligible adjustment, inspect input, expected output, protected minimum, liquidity, price impact, fees, gas and contract evidence.
5. Open `/activity` to see honest prepared/transaction states and live residual USDC allowance recovery.
6. Open `/proof` and `/docs` for deployment identity, reference pins and explicit limitations.

## Safety truth

- The public release keeps mainnet execution disabled.
- Browser preferences are advisory, not contract-enforced limits.
- No backend holds a key and no unattended signer exists.
- A buy approval and buy are separate wallet confirmations.
- Kuru's direct order has no onchain deadline; stale wallet requests must be rejected and prepared again.
- No simulation, approval or submitted hash is presented as a successful fill.

## Local verification

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm test:live
```

The live command performs read-only RPC calls only.
