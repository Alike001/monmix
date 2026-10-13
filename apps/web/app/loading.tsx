export default function Loading() {
  return (
    <div className="page loading-page" aria-live="polite">
      <span className="eyebrow">Reading Monad</span>
      <div className="skeleton wide" />
      <div className="skeleton" />
    </div>
  );
}
