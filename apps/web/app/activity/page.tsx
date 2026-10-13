export default function ActivityPage() {
  return (
    <div className="page">
      <header className="page-title"><span className="eyebrow">03 · Activity</span><h1>No transaction history is the truthful history.</h1><p>Milestone 1 performs public reads and local policy evaluation only. It does not create orders, approvals, signatures, transaction hashes, fills, or cancellations.</p></header>
      <section className="card record-empty">
        <div><div className="empty-icon">∅</div><span className="eyebrow">Verified empty state</span><h2>No onchain actions from this application</h2><p>Once a later, separately approved milestone submits a transaction, this surface must reconcile broadcast, inclusion, Kuru order events, fills, cancellation, and failure. Until then, inventing records would be misleading.</p><div className="notice" style={{ marginTop: 20 }}>Future states, not active: proposed → awaiting owner → broadcast → included → filled / partial / open / cancelled / reverted.</div></div>
      </section>
    </div>
  );
}
