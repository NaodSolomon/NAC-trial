'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { API_URL } from '@/lib/constants';
import { detectDeviceType, sanitizePublicAnalyticsPath } from './public-route-analytics';

export function PublicRouteAnalytics() {
  const pathname = usePathname();
  const lastRecordedPath = useRef<string | null>(null);

  useEffect(() => {
    const safePath = sanitizePublicAnalyticsPath(pathname);
    if (!safePath || safePath === lastRecordedPath.current) return;
    lastRecordedPath.current = safePath;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1_500);
    void fetch(`${API_URL}/public/analytics/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'omit',
      keepalive: true,
      signal: controller.signal,
      body: JSON.stringify({
        eventType: 'page_view',
        pageUrl: safePath,
        deviceType: detectDeviceType(window.innerWidth),
      }),
    })
      .catch(() => undefined)
      .finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [pathname]);

  return null;
}
