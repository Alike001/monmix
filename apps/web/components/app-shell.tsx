import Link from 'next/link';
import type { ReactNode } from 'react';
import { ConnectWallet } from '@/features/wallet/connect-wallet';
import { PrimaryNavigation } from '@/components/primary-navigation';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Monad Strategy Desk home">
          <span className="brand-mark">M</span>
          <span>Strategy Desk</span>
          <small>safe mode</small>
        </Link>
        <PrimaryNavigation />
        <ConnectWallet compact />
      </header>
      <main id="main-content">{children}</main>
      <footer className="footer">
        <div>
          <strong>Monad Strategy Desk</strong>
          <p>Live Kuru reads, deterministic policy, exact simulation, owner-confirmed execution disabled by default.</p>
        </div>
        <div className="footer-links">
          <Link href="/docs">Method & limits</Link>
          <a href="https://kuru.io" rel="noreferrer" target="_blank">Kuru</a>
          <a href="https://monad.xyz" rel="noreferrer" target="_blank">Monad</a>
        </div>
      </footer>
    </div>
  );
}
