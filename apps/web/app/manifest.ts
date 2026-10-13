import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MonMix — Your crypto, your mix.',
    short_name: 'MonMix',
    description: 'Keep your MON and USDC holdings aligned with your target allocation using live Kuru market data.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f1e9',
    theme_color: '#171b17',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
