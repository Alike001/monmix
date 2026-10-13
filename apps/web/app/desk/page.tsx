import { AllocationPanel } from '@/features/desk/allocation-panel';

export default function DeskPage() {
  return (
    <div className="page">
      <header className="page-title">
        <span className="eyebrow">02 · Shape the portfolio</span>
        <h1>Turn holdings into one explainable decision.</h1>
        <p>Connect an injected wallet, choose the MON share you want, and see whether the next adjustment should wait, be refused, or advance to an exact Kuru simulation.</p>
        <div className="route-note"><span>Owner-controlled wallet</span><span>•</span><span>200 MON venue minimum</span><span>•</span><span>Execution off by default</span></div>
      </header>
      <AllocationPanel />
    </div>
  );
}
