export default function DocsPage() {
  return (
    <div className="page narrow">
      <header className="page-title"><span className="eyebrow">Method & limits</span><h1>How the desk reaches—and stops before—a transaction.</h1></header>
      <article className="docs-copy">
        <h2>Market source</h2><p>The application calls the deployed Kuru MON/USDC proxy on Monad mainnet through independently declared minimal read and direct-order ABIs. It does not import either Kuru SDK. Preflight verifies the EIP-1967 implementation address and runtime code hash before trusting the interface.</p>
        <h2>Price normalization</h2><p>Kuru&apos;s packed L2 prices use the market&apos;s reported <code>pricePrecision</code> of 1e8. The deployed <code>bestBidAsk()</code> values use 1e18. Both are normalized with bigint arithmetic and must agree within 1%; otherwise the read is rejected. Live prices are never embedded in source as fallback data.</p>
        <h2>Portfolio policy</h2><p>Native MON is valued in six-decimal USDC atoms using the verified midpoint. The original Phase 0 policy compares that value with the wallet&apos;s USDC balance and returns WAIT, BLOCK, or REVIEW. Per-action and daily budgets limit the recommendation only.</p>
        <h2>Kuru size and output rules</h2><p>The market reports <code>minSize = 2e12</code> at <code>sizePrecision = 1e10</code>, exactly 200 MON. The deployed market-sell function accepts smaller calls, but Strategy Desk deliberately refuses them to respect the venue&apos;s declared minimum. Native MON <code>msg.value</code> equals the normalized base amount in 18-decimal atoms. Output protection is a bigint USDC-atom floor calculated from an exact simulation.</p>
        <h2>Fill-or-kill semantics</h2><p>The prepared call is <code>placeAndExecuteMarketSell(size, minAmountOut, false, true)</code>. Fill-or-kill makes insufficient full-size liquidity revert; the minimum output separately protects the received USDC. The call has no onchain deadline, so the app uses a 20-second preparation lifetime and re-simulates immediately before opening the wallet.</p>
        <h2>Security boundary</h2><p>Only a native MON sell is prepared. There is no backend key, private-key input, automated signer, token approval, custom contract, blind retry, or USDC buy path. The transaction journal is local to this browser. Strategy preferences remain advisory TypeScript inputs, not independently enforced caps.</p>
        <h2>Execution gate</h2><p>The owner-confirmed injected-wallet path is compiled but disabled unless <code>NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=true</code> is explicitly set for a reviewed build. This phase did not sign or broadcast a transaction. A real trade still requires owner approval, a funded wallet with at least 200 MON plus gas, and a final live review.</p>
      </article>
    </div>
  );
}
