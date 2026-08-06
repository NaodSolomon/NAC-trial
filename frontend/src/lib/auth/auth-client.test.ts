import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAccessToken, getAccessToken } from './access-token';
import { clearLegacyBrowserStorage, refreshSession } from './auth-client';
import { legacyAuthStorageKey } from './constants';

describe('browser authentication lifecycle', () => {
  afterEach(() => {
    clearAccessToken();
    vi.unstubAllGlobals();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('coalesces simultaneous refreshes and retains the access token only in memory', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          accessToken: 'memory-access-token',
          expiresIn: 900,
          admin: {
            id: 'admin-1',
            email: 'admin@example.org',
            name: 'Administrator',
            role: 'SUPER_ADMIN',
          },
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const [first, second] = await Promise.all([refreshSession(), refreshSession()]);

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('memory-access-token');
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('removes storage left by the former persistent-token implementation', () => {
    window.localStorage.setItem(legacyAuthStorageKey, 'sensitive');
    window.sessionStorage.setItem(legacyAuthStorageKey, 'sensitive');

    clearLegacyBrowserStorage();

    expect(window.localStorage.getItem(legacyAuthStorageKey)).toBeNull();
    expect(window.sessionStorage.getItem(legacyAuthStorageKey)).toBeNull();
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
