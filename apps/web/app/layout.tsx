import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { Providers } from './providers';
import './globals.css';

const productDescription = 'MonMix helps you keep your MON and USDC holdings aligned with your goals. Choose your target allocation, see when your portfolio drifts, and review protected trades through Kuru to rebalance—all while keeping control of your wallet.';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'MonMix — Your crypto, your mix.',
    template: '%s | MonMix',
  },
  description: productDescription,
  applicationName: 'MonMix',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'MonMix',
    title: 'MonMix — Your crypto, your mix.',
    description: productDescription,
    url: '/',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'MonMix — your MON and USDC allocation, kept in view.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MonMix — Your crypto, your mix.',
    description: productDescription,
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
