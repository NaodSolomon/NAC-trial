import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, frontendSecurityHeaders } from './security-headers';

const productionEnvironment = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_API_URL: 'https://api.example.org/api/v1',
  NEXT_PUBLIC_STORAGE_ORIGIN: 'https://media.example.org/uploads',
  NEXT_PUBLIC_MEDIA_HOSTS: 'https://cdn.example.org, https://media.example.org',
};

describe('frontend security headers', () => {
  it('builds a production CSP for the API, media, maps, fonts, and Next.js runtime', () => {
    const policy = buildContentSecurityPolicy(productionEnvironment);

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).toContain("font-src 'self' data:");
    expect(policy).toContain('https://api.example.org');
    expect(policy).toContain('https://media.example.org');
    expect(policy).toContain('https://cdn.example.org');
    expect(policy).toContain('frame-src https://google.com https://*.google.com');
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain('upgrade-insecure-requests');
    expect(policy.match(/https:\/\/media\.example\.org/g)).toHaveLength(3);
  });

  it('adds HSTS and the required browser policies in production', () => {
    const headers = Object.fromEntries(
      frontendSecurityHeaders(productionEnvironment).map(({ key, value }) => [key, value]),
    );

    expect(headers).toMatchObject({
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-DNS-Prefetch-Control': 'off',
      'X-Permitted-Cross-Domain-Policies': 'none',
      'X-XSS-Protection': '0',
    });
    expect(headers['Permissions-Policy']).toContain('camera=()');
    expect(headers['Permissions-Policy']).toContain('payment=()');
  });

  it('allows development hot reload without emitting HSTS', () => {
    const headers = frontendSecurityHeaders({
      NODE_ENV: 'development',
      NEXT_PUBLIC_API_URL: 'http://localhost:8000/api/v1',
      NEXT_PUBLIC_STORAGE_ORIGIN: 'http://localhost:9000',
    });
    const policy = headers.find(({ key }) => key === 'Content-Security-Policy')?.value;

    expect(policy).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(policy).toContain('connect-src');
    expect(policy).toContain('ws: wss:');
    expect(headers.some(({ key }) => key === 'Strict-Transport-Security')).toBe(false);
  });

  it('ignores malformed and non-HTTP configured origins', () => {
    const policy = buildContentSecurityPolicy({
      NODE_ENV: 'production',
      NEXT_PUBLIC_API_URL: 'javascript:alert(1)',
      NEXT_PUBLIC_STORAGE_ORIGIN: 'not-a-url',
      NEXT_PUBLIC_MEDIA_HOSTS: 'ftp://files.example.org',
    });

    expect(policy).not.toContain('javascript:');
    expect(policy).not.toContain('not-a-url');
    expect(policy).not.toContain('ftp://');
  });
});
