import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@seg/types'],
  devIndicators: false,
};

export default nextConfig;
