# Controlled local mainnet execution session

This procedure prepares a local, owner-operated MonMix session. It is **not authorization to trade**. Do not run the launcher until the owner separately approves the exact Git commit, account, direction, amount, live review and maximum gas cost.

Vercel Production and Preview must keep `NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false`. The local launcher does not create or edit an environment file and cannot run when `CI`, `VERCEL` or `VERCEL_ENV` is present.

## Why the release guard scans files

Next.js loads production variables in this order: `process.env`, `.env.production.local`, `.env.local`, `.env.production`, then `.env`. Public variables are embedded into the browser bundle during the build. The guarded release build therefore checks both the process environment and every production env file Next.js can load from `apps/web`; any execution definition other than literal `false` refuses the release build.

## Owner-attended prerequisites

1. Use the pinned Node 22 and pnpm 10.34.5 toolchain.
2. Check out the exact separately approved commit and run `pnpm install --frozen-lockfile`.
3. Confirm `git status --short` is empty.
4. Run `NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false pnpm verify` and `pnpm test:live`.
5. In MetaMask, select the owner-approved account and Monad Mainnet, chain ID 143. Never enter a seed phrase or private key into MonMix or the terminal.
6. Confirm the strategy independently recommends a MON sell of at least the live declared venue minimum. The exact-minimum option cannot create or enlarge a recommendation.

## Dry launcher validation

This validates the host, commit and clean-tree restrictions without building or starting a server:

```bash
pnpm local:execution -- \
  --check \
  --commit <FULL_APPROVED_40_CHARACTER_GIT_SHA> \
  --acknowledge=I_APPROVE_LOCAL_MAINNET_EXECUTION
```

## Start only after separate trade authorization

```bash
pnpm local:execution -- \
  --commit <FULL_APPROVED_40_CHARACTER_GIT_SHA> \
  --port 3000 \
  --acknowledge=I_APPROVE_LOCAL_MAINNET_EXECUTION
```

The launcher:

- builds with the execution flag only in the child process environment;
- binds Next.js to `127.0.0.1`, not a LAN or public interface;
- refuses hosted/CI environments, a dirty worktree or a different commit;
- creates no `.env` file and changes no tracked configuration.

Open only `http://127.0.0.1:3000/desk`. The app must report the selected injected provider, approved account, Monad Mainnet and chain ID 143 consistently before a preparation can become actionable.

## Exact 200 MON review

When the deterministic policy already recommends selling at least 200 MON, select **Exact venue minimum**. The UI keeps the larger strategy recommendation visible and labels 200 MON as the owner-selected amount. Changing the amount clears any prior preparation.

Run a new simulation and record the fresh values. The server re-reads the market deployment, implementation code hash, order book, balances and gas, then simulates the exact protected call. It independently refuses amounts below the declared minimum, above the declared maximum, above the wallet balance plus gas reserve, or without full-fill liquidity.

Expected transaction shape:

```text
network: Monad Mainnet (143)
to: 0x065C9d28E428A0db40191a54d33d5b7c71a9C394
selector: 0x532c46db
function: placeAndExecuteMarketSell(uint96,uint256,bool,bool)
value: 200000000000000000000 wei (200 MON)
size: 2000000000000
minAmountOut: fresh protected USDC atoms shown in the review
isMargin: false
isFillOrKill: true
token approval: none
```

MetaMask may show decoded arguments or only contract interaction data. It must show Monad Mainnet, the exact proxy destination and 200 MON value. Its network-fee estimate may differ from the app's conservative reviewed ceiling as gas changes; reject if the wallet maximum is above the owner-approved ceiling or any field cannot be verified.

Kuru has no onchain deadline. The browser's 20-second review expiry does not constrain a request already open in MetaMask. Confirm immediately after the final revalidation or reject it. A rejection records no hash and triggers no automatic retry. Close the local server with `Ctrl+C`, then start a new separately approved session if another attempt is ever required.

## Stop and preserve evidence

After a rejection or one authorized submission, stop the server. Do not reuse the authorization. Preserve the local journal, transaction hash if one exists, receipt, verified Kuru Trade events, and before/after balances. Public Vercel builds remain execution-disabled throughout.
