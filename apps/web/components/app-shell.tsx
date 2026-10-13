import Link from 'next/link';
import type { ReactNode } from 'react';
import { ConnectWallet } from '@/features/wallet/connect-wallet';

const navigation = [
  ['Market', '/markets'],
  ['Strategy desk', '/desk'],
  ['Activity', '/activity'],
  ['Proof', '/proof'],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Monad Strategy Desk home">
          <span className="brand-mark">M</span>
          <span>Strategy Desk</span>
          <small>read-only</small>
        </Link>
        <nav aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        <ConnectWallet compact />
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div>
          <strong>Monad Strategy Desk</strong>
          <p>Live reads, deterministic reviews, zero transaction capability in Milestone 1.</p>
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
