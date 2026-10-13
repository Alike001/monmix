# Milestone 1 threat model

## Assets and trust boundaries

The application reads public chain state and a connected wallet's public address. It does not custody tokens, secrets, signatures or approvals. The main integrity asset is the correctness of the displayed market and recommendation.

## Threats and controls

| Threat | Control |
| --- | --- |
| Wrong chain or spoofed RPC | Require RPC chain ID 143; require connected wallet chain 143 independently. |
| Wrong market or token decimals | Compare every market parameter with the pinned deployed market, native MON, USDC address and decimals. |
| Factor-of-ten valuation error | Normalize packed L2 at reported 1e8 and BBO at 1e18; reject >1% disagreement; regression test the 10x case. |
| Stale data | Use the L2 block timestamp and block the policy after 30 seconds. No cached price fallback. |
| Malformed or incomplete packed bytes | Require full 32-byte words, bid separator, nonzero paired sizes and no trailing data. |
| Zero or one-sided liquidity | Mark market `EMPTY` and block review. |
| Inadequate visible depth or market minimum | Walk price levels using integer units; block below minimum or insufficient depth. |
| Misleading safety claim | UI and documentation state that TypeScript caps are advisory and not contract enforced. |
| Accidental transaction path | No write ABI, wallet client, approval function, transaction route, signer, private-key input or worker exists. |
| Reference-license contamination | References live outside the product repo; dependencies were not installed; no source or assets imported. |

## Residual risk

Public RPC responses can be unavailable or malicious despite consistency checks. Visible order-book depth can change before any future execution. Wallet extensions remain third-party software. The current product must not be used as an execution guarantee.
