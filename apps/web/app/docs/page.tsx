export default function DocsPage() {
  return (
    <div className="page narrow">
      <header className="page-title"><span className="eyebrow">Method & limits</span><h1>How the read-only desk reaches a decision.</h1></header>
      <article className="docs-copy">
        <h2>Market source</h2><p>The application calls the deployed Kuru MON/USDC market on Monad mainnet through a minimal ABI containing only <code>getMarketParams()</code>, <code>getL2Book()</code>, and <code>bestBidAsk()</code>. It does not import either Kuru SDK.</p>
        <h2>Price normalization</h2><p>Kuru&apos;s packed L2 prices use the market&apos;s reported <code>pricePrecision</code> of 1e8. The deployed <code>bestBidAsk()</code> values use 1e18. Both are normalized with bigint arithmetic and must agree within 1%; otherwise the read is rejected. Live prices are never embedded in source as fallback data.</p>
        <h2>Portfolio policy</h2><p>Native MON is valued in six-decimal USDC atoms using the verified midpoint. The original Phase 0 policy compares that value with the wallet&apos;s USDC balance and returns WAIT, BLOCK, or REVIEW. Per-action and daily budgets limit the recommendation only.</p>
        <h2>Security boundary</h2><p>There is no wallet client, write ABI, approval call, transaction construction, signing, broadcasting, keeper, worker, contract deployment, or private-key handling. The injected wallet connection supplies a public address and chain identity only.</p>
        <h2>Execution gate</h2><p>A future mainnet trade still requires a new review of Kuru&apos;s supported write path, exact approvals, min-out semantics, expiry, partial fills, failure recovery, transaction reconciliation, and independently enforceable limits. That is outside this release.</p>
      </article>
    </div>
  );
}
