import { FastifyRequest } from 'fastify';
import { redactSensitivePath, safeRequestPath } from './safe-request-path';

describe('safeRequestPath', () => {
  it('uses the registered route template instead of parameter values', () => {
    expect(
      safeRequestPath({
        url: '/api/v1/admin/newsletter/subscriber%40example.org?source=test',
        routeOptions: { url: '/api/v1/admin/newsletter/:email' },
      } as FastifyRequest),
    ).toBe('/api/v1/admin/newsletter/:email');
  });

  it.each([
    '/api/v1/admin/newsletter/subscriber@example.org',
    '/api/v1/admin/newsletter/subscriber%40example.org',
    '/api/v1/admin/newsletter/not-even-a-valid-email',
  ])('redacts the newsletter identifier in fallback path %s', (path) => {
    expect(redactSensitivePath(path)).toBe('/api/v1/admin/newsletter/[REDACTED]');
  });

  it('redacts email-like values in any unmatched path', () => {
    expect(redactSensitivePath('/unknown/subscriber%40example.org/action')).toBe(
      '/unknown/[REDACTED]/action',
    );
  });
});
