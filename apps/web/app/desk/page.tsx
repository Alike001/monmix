import { AllocationPanel } from '@/features/desk/allocation-panel';

export default function DeskPage() {
  return (
    <div className="page">
      <header className="page-title">
        <span className="eyebrow">02 · Shape the portfolio</span>
        <h1>Turn holdings into one explainable decision.</h1>
        <p>Connect an injected wallet to read MON and USDC. Set a target and advisory limits; the desk returns WAIT, BLOCK, or REVIEW against fresh Kuru depth.</p>
        <div className="route-note"><span>Owner-controlled wallet</span><span>•</span><span>Read-only RPC</span><span>•</span><span>No signing code</span></div>
      </header>
      <AllocationPanel />
    </div>
  );
}
