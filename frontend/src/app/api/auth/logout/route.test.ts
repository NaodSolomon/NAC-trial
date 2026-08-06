// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

describe('logout route handler', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('passes the HTTP-only refresh token to the protected backend logout route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { message: 'Logged out successfully' },
          statusCode: 200,
          timestamp: '2026-08-06T00:00:00.000Z',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        authorization: 'Bearer access-token',
        cookie: 'nac-admin-refresh=refresh-token',
      },
    });

    const response = await POST(request);
    const upstream = fetchMock.mock.calls[0];

    expect(response.status).toBe(200);
    expect(upstream[0]).toContain('/auth/logout');
    expect(new Headers(upstream[1]?.headers).get('authorization')).toBe('Bearer access-token');
    expect(upstream[1]?.body).toBe(JSON.stringify({ refreshToken: 'refresh-token' }));
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
