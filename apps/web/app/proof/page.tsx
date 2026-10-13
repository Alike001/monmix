import { MarketPanel } from '@/features/market/market-panel';
import { KURU_MON_USDC_MARKET, USDC_ADDRESS } from '@monad-strategy/kuru-adapter';

export default function ProofPage() {
  return (
    <div className="page">
      <header className="page-title"><span className="eyebrow">04 · Proof</span><h1>Claims separated from evidence.</h1><p>This page identifies what the application verifies live, what was inspected as research, and what remains deliberately unavailable.</p></header>
      <div className="proof-grid">
        <section className="card proof-card full"><span className="eyebrow">Live application evidence</span><h3>Current Kuru contract read</h3><MarketPanel compact /></section>
        <section className="card proof-card"><span className="eyebrow">Deployment identity</span><h3>Verified constants</h3><div className="evidence-list"><div className="evidence-row"><span>Chain</span><strong>Monad mainnet · 143</strong></div><div className="evidence-row"><span>Market</span><strong>{KURU_MON_USDC_MARKET}</strong></div><div className="evidence-row"><span>Quote token</span><strong>{USDC_ADDRESS}</strong></div><div className="evidence-row"><span>Base token</span><strong>Native MON · zero address</strong></div></div></section>
        <section className="card proof-card"><span className="eyebrow">Reference pins</span><h3>Read-only research</h3><div className="evidence-list"><div className="evidence-row"><span>Shijima</span><strong>393cf8ad37d637d6d7264e58bed4747809fa6e67</strong></div><div className="evidence-row"><span>Masayume</span><strong>68f7a09031a1f78927d0cb4bacba5f182bfcad38</strong></div><div className="evidence-row"><span>Kuru TS</span><strong>8588784c4d54183a04029cb1b513910c806905a9</strong></div><div className="evidence-row"><span>Kuru SDK</span><strong>636509c2eafd63479d3f399703354e0d09f51e18</strong></div></div></section>
        <section className="card proof-card"><span className="eyebrow">Implemented</span><h3>Evidence available now</h3><ul className="check-list"><li>Raw chain ID and deployed bytecode reads</li><li>Market parameters and token decimals</li><li>Packed L2 plus independent BBO scale agreement</li><li>Native MON and ERC-20 USDC balances</li><li>Deterministic policy and negative tests</li></ul></section>
        <section className="card proof-card"><span className="eyebrow">Not yet implemented</span><h3>No implied execution proof</h3><ul className="check-list"><li className="future">No approval or allowance behavior verified</li><li className="future">No signed transaction or Kuru order</li><li className="future">No fill, cancellation, or receipt evidence</li><li className="future">No independently enforced caps</li><li className="future">No automation or revocation system</li></ul></section>
      </div>
    </div>
  );
}
