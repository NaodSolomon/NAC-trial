import { describe, expect, it } from 'vitest';
import { detectDeviceType, sanitizePublicAnalyticsPath } from './public-route-analytics';

describe('public route analytics privacy boundary', () => {
  it('keeps only a normalized local pathname', () => {
    expect(sanitizePublicAnalyticsPath('/blog/story?email=person@example.org#form')).toBe(
      '/blog/story',
    );
    expect(sanitizePublicAnalyticsPath('/events/')).toBe('/events');
  });

  it.each(['/admin', '/admin/users', '/dashboard', '/login', '/api/auth/refresh'])(
    'rejects private route %s',
    (path) => expect(sanitizePublicAnalyticsPath(path)).toBeNull(),
  );

  it('rejects remote, malformed, and oversized values', () => {
    expect(sanitizePublicAnalyticsPath('https://example.org/about')).toBeNull();
    expect(sanitizePublicAnalyticsPath('//example.org/about')).toBeNull();
    expect(sanitizePublicAnalyticsPath('/contact/person name')).toBeNull();
    expect(sanitizePublicAnalyticsPath('/' + 'x'.repeat(2_048))).toBeNull();
  });

  it('classifies viewport width without collecting an identifier', () => {
    expect(detectDeviceType(390)).toBe('mobile');
    expect(detectDeviceType(800)).toBe('tablet');
    expect(detectDeviceType(1440)).toBe('desktop');
    expect(detectDeviceType(0)).toBe('unknown');
  });
});
