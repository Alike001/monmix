# Third-party notices

This file records research references and packaged dependencies. It does not replace their license texts or imply endorsement.

## Reference repositories

| Reference | Pinned commit | License finding | Use in this project |
| --- | --- | --- | --- |
| Blockchain-Oracle/shijima | `393cf8ad37d637d6d7264e58bed4747809fa6e67` | Root MIT license, copyright 2026 Abubakr Jimoh; its own notices warn that some upstream interface material has unresolved redistribution rights | Architectural study only: owner/operator separation, bounded policy, journal/recovery patterns and evidence-first product states. No source or assets copied. |
| Blockchain-Oracle/masayume | `68f7a09031a1f78927d0cb4bacba5f182bfcad38` | No repository-wide license grant found; its notice explicitly says not to infer one | Product-design study only: market-first composition, ticket feedback, responsive states and judge-facing explanation. No source, branding, assets, fonts, music, or copy used. |
| Kuru-Labs/ts-sdk | `8588784c4d54183a04029cb1b513910c806905a9` | Package `@toxicflow-labs/ts-sdk@0.3.0`, `UNLICENSED` | Inspected for current interface generation and deployment-compatibility research only. Not installed, imported, copied, or redistributed. |
| Kuru-Labs/kuru-sdk | `636509c2eafd63479d3f399703354e0d09f51e18` | Package metadata declares ISC for `@kuru-labs/kuru-sdk@0.0.97` | Inspected to understand the deployed legacy order-book response. Not a dependency and no implementation source was copied. |

The project's three-function Kuru ABI was independently declared from verified deployed contract calls. Function signatures and return shapes are documented integration facts, not an imported SDK artifact.

## Runtime and development dependencies

The lockfile is the authoritative dependency inventory. Principal direct packages include Next.js, React, wagmi, viem, TanStack Query, TypeScript and ESLint. Each retains its upstream license and copyright notice. No third-party visual assets or web fonts are bundled.
