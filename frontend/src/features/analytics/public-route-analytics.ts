const privateRoutePrefixes = ['/admin', '/api', '/dashboard', '/login'];

export function sanitizePublicAnalyticsPath(value: string): string | null {
  const path = value.split(/[?#]/, 1)[0]?.trim();
  if (!path || path.length > 2_048 || !path.startsWith('/') || path.startsWith('//')) return null;
  if (/\s/.test(path)) return null;
  const normalized = path.length > 1 ? path.replace(/\/+$/, '') : path;
  if (
    privateRoutePrefixes.some(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
    )
  ) {
    return null;
  }
  return normalized;
}

export function detectDeviceType(width: number): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
  if (!Number.isFinite(width) || width <= 0) return 'unknown';
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}
