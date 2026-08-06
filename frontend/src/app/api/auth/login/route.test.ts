// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

describe('login route handler', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('moves the refresh token into an HTTP-only cookie and strips it from JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: 'short-lived-access',
              refreshToken: 'sensitive-refresh',
              expiresIn: 900,
              admin: {
                id: 'admin-1',
                email: 'admin@example.org',
                name: 'Administrator',
                role: 'SUPER_ADMIN',
              },
            },
            statusCode: 200,
            timestamp: '2026-08-06T00:00:00.000Z',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@example.org', password: 'Password123' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const body = await response.text();
    const cookie = response.headers.get('set-cookie');

    expect(response.status).toBe(200);
    expect(body).toContain('short-lived-access');
    expect(body).not.toContain('sensitive-refresh');
    expect(cookie).toContain('nac-admin-refresh=sensitive-refresh');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=strict');
  });

  it('returns a controlled unavailable response when the backend cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@example.org', password: 'Password123' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ success: false, statusCode: 503 });
  });
});
