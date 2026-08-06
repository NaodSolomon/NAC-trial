import type { NextConfig } from 'next';

function storageRemotePattern(): URL {
  const origin = process.env.NEXT_PUBLIC_STORAGE_ORIGIN ?? 'http://localhost:9000';
  return new URL('/**', origin);
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Windows cannot create pnpm's standalone symlinks without Developer Mode.
  output: process.platform === 'win32' ? undefined : 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 390, 640, 750, 828, 1080, 1200, 1440, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [storageRemotePattern()],
    contentDispositionType: 'attachment',
    dangerouslyAllowSVG: false,
  },
};

export default nextConfig;
