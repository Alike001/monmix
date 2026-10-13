import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@monad-strategy/domain', '@monad-strategy/kuru-adapter'],
};

export default nextConfig;
