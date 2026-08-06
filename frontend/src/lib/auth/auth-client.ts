import { ApiRequestError, apiErrorFromResponse } from '@/lib/api/errors';
import { clearAccessToken, getAccessToken, setAccessToken } from './access-token';
import { legacyAuthStorageKey, type BrowserAuthSession } from './constants';

interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

let refreshInFlight: Promise<BrowserAuthSession | null> | null = null;

export async function loginAdministrator(input: {
  email: string;
  password: string;
}): Promise<BrowserAuthSession> {
  const session = await sameOriginAuthRequest<BrowserAuthSession>('/api/auth/login', input);
  setAccessToken(session.accessToken);
  return session;
}

export function refreshSession(): Promise<BrowserAuthSession | null> {
  if (!refreshInFlight) {
    refreshInFlight = sameOriginAuthRequest<BrowserAuthSession>('/api/auth/refresh')
      .then((session) => {
        setAccessToken(session.accessToken);
        return session;
      })
      .catch((error: unknown) => {
        clearAccessToken();
        if (error instanceof ApiRequestError && error.status === 401) return null;
        throw error;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function refreshAccessToken(): Promise<string | null> {
  return (await refreshSession())?.accessToken ?? null;
}

export async function logoutAdministrator(): Promise<void> {
  const token = getAccessToken();
  try {
    await sameOriginAuthRequest<{ message: string }>('/api/auth/logout', undefined, token);
  } finally {
    clearAccessToken();
    clearLegacyBrowserStorage();
  }
}

export function clearLegacyBrowserStorage(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(legacyAuthStorageKey);
  window.sessionStorage.removeItem(legacyAuthStorageKey);
}

async function sameOriginAuthRequest<T>(
  path: string,
  body?: unknown,
  accessToken?: string | null,
): Promise<T> {
  const headers = new Headers({ accept: 'application/json' });
  if (body !== undefined) headers.set('content-type', 'application/json');
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (cause) {
    throw new ApiRequestError({
      kind: 'NETWORK',
      status: 0,
      message: 'The authentication service could not be reached.',
      cause,
    });
  }

  const payload = await parsePayload(response);
  if (!response.ok) throw apiErrorFromResponse(response.status, payload);
  if (!isSuccessEnvelope<T>(payload)) {
    throw new ApiRequestError({
      kind: 'CONTRACT',
      status: response.status,
      message: 'The authentication service returned an unexpected response.',
    });
  }
  return payload.data;
}

async function parsePayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isSuccessEnvelope<T>(value: unknown): value is SuccessEnvelope<T> {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as { success?: unknown }).success === true &&
    'data' in value,
  );
}
