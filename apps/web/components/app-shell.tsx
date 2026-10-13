import Link from 'next/link';
import type { ReactNode } from 'react';
import { ConnectWallet } from '@/features/wallet/connect-wallet';
import { PrimaryNavigation } from '@/components/primary-navigation';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="MonMix home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" role="presentation">
              <path d="M7 23V9l9 8 9-8v14" />
              <path className="brand-mark-accent" d="M7 9l9 8 9-8" />
            </svg>
          </span>
          <span>MonMix</span>
          <small>safe mode</small>
        </Link>
        <PrimaryNavigation />
        <ConnectWallet />
      </header>
      <main id="main-content">{children}</main>
      <footer className="footer">
        <div>
          <strong>MonMix</strong>
          <p>Your crypto, your mix. Live Kuru reads, deterministic policy, and owner-controlled trade preparation.</p>
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
