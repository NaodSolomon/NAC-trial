import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Windows cannot create pnpm's standalone symlinks without Developer Mode.
  output: process.platform === 'win32' ? undefined : 'standalone',
};

export default nextConfig;
