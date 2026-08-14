import { afterEach, describe, expect, it, vi } from 'vitest';
import nextConfig from './next.config';

afterEach(() => vi.unstubAllEnvs());

describe('Next.js frontend response headers', () => {
  it('applies the production security policy to every route', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.org/api/v1');
    vi.stubEnv('NEXT_PUBLIC_STORAGE_ORIGIN', 'https://media.example.org');

    const rules = await nextConfig.headers?.();
    const allRoutes = rules?.find(({ source }) => source === '/(.*)');
    const headers = Object.fromEntries(
      (allRoutes?.headers ?? []).map(({ key, value }) => [key, value]),
    );

    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('geolocation=()');
  });
});
