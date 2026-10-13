'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="page">
      <section className="availability card">
        <span className="eyebrow danger">Application boundary</span>
        <h1>MonMix could not complete this read.</h1>
        <p>No transaction was created. Retry the route or inspect the proof page for RPC status.</p>
        <button className="button" type="button" onClick={unstable_retry}>Retry read</button>
      </section>
    </div>
  );
}
