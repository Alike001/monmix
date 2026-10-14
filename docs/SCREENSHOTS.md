# MonMix release screenshots

These screenshots were captured from the guarded production build with `NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false` at 1440×1000 and 390×844. Market values are genuine read-only Kuru observations at capture time; wallet-dependent screens truthfully show the disconnected state. No balance, transaction, receipt or performance data is fabricated.

Run `pnpm screenshots` while the production application is available at `http://127.0.0.1:3100`. Set `SCREENSHOT_BASE_URL` to capture another reviewed origin.

| Route | Desktop | Mobile |
| --- | --- | --- |
| Landing `/` | [home-desktop.png](screenshots/home-desktop.png) | [home-mobile.png](screenshots/home-mobile.png) |
| Market `/markets` | [market-desktop.png](screenshots/market-desktop.png) | [market-mobile.png](screenshots/market-mobile.png) |
| Strategy `/desk` | [strategy-desktop.png](screenshots/strategy-desktop.png) | [strategy-mobile.png](screenshots/strategy-mobile.png) |
| Activity `/activity` | [activity-desktop.png](screenshots/activity-desktop.png) | [activity-mobile.png](screenshots/activity-mobile.png) |
| Proof `/proof` | [proof-desktop.png](screenshots/proof-desktop.png) | [proof-mobile.png](screenshots/proof-mobile.png) |
| Method `/docs` | [docs-desktop.png](screenshots/docs-desktop.png) | [docs-mobile.png](screenshots/docs-mobile.png) |
| Wallet chooser | [wallet-desktop.png](screenshots/wallet-desktop.png) | [wallet-mobile.png](screenshots/wallet-mobile.png) |
| Interactive strategy workflow | [workflow-desktop.png](screenshots/workflow-desktop.png) | [workflow-mobile.png](screenshots/workflow-mobile.png) |

The interactive workflow captures use a funded mock wallet and deterministic Kuru-shaped responses to show completed Portfolio, Target, Decision, and Preview states. The values are test fixtures, not a real trade or production-wallet evidence; execution remains disabled. The earlier focused simulation capture remains available at [sell-simulation-desktop.png](screenshots/sell-simulation-desktop.png).
