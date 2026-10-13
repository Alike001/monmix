import type { Metadata } from 'next';
import { AllocationPanel } from '@/features/desk/allocation-panel';

export const metadata: Metadata = { title: 'Strategy', description: 'Compare your current MON and USDC allocation with your target and review a protected Kuru adjustment.' };

export default function DeskPage() {
  return (
    <div className="page">
      <header className="page-title">
        <span className="eyebrow">Portfolio strategy</span>
        <h1>Keep your MON mix on target.</h1>
        <p>See what you hold, choose the split you want, and get one clear next step using Kuru&apos;s live market.</p>
        <div className="route-note"><span>Wallet stays in your control</span><span>•</span><span>200 MON minimum order</span><span>•</span><span>No automatic trading</span></div>
      </header>
      <AllocationPanel />
    </div>
  );
}
