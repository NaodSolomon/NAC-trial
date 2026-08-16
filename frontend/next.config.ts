import type { NextConfig } from 'next';
import { frontendSecurityHeaders, withheldRouteHeaders } from './src/lib/security/security-headers';

function mediaRemotePatterns(): URL[] {
  const storageOrigin = process.env.NEXT_PUBLIC_STORAGE_ORIGIN;
  if (process.env.NODE_ENV === 'production' && !storageOrigin) {
    throw new Error('NEXT_PUBLIC_STORAGE_ORIGIN is required for a production build');
  }

  const origins = [
    storageOrigin ?? 'http://localhost:9000',
    process.env.MEDIA_IMAGE_ORIGIN,
    ...(process.env.NEXT_PUBLIC_MEDIA_HOSTS ?? '').split(','),
  ];
  return [
    ...new Map(
      origins.flatMap((value) => {
        if (!value?.trim()) return [];
        try {
          const url = new URL(value.trim());
          if (!['http:', 'https:'].includes(url.protocol)) return [];
          return [[url.origin, new URL('/**', url)] as const];
        } catch {
          return [];
        }
      }),
    ).values(),
  ];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: frontendSecurityHeaders(process.env),
      },
      { source: '/team', headers: withheldRouteHeaders() },
      { source: '/team/:path*', headers: withheldRouteHeaders() },
      { source: '/admin/:path*', headers: withheldRouteHeaders() },
    ];
  },
  // Windows cannot create pnpm's standalone symlinks without Developer Mode.
  output: process.platform === 'win32' ? undefined : 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 390, 448, 640, 750, 828, 1080, 1200, 1366, 1440, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    remotePatterns: mediaRemotePatterns(),
    contentDispositionType: 'attachment',
    dangerouslyAllowSVG: false,
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;
