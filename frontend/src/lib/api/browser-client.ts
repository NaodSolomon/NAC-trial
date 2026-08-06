import { API_URL } from '@/lib/constants';
import { createApiClient } from './transport';

export const browserApiClient = createApiClient({
  baseUrl: API_URL,
  credentials: 'include',
  getAccessToken: readPersistedAccessToken,
  maxGetRetries: 2,
});

function readPersistedAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem('auth-storage');
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { state?: { token?: unknown } };
    return typeof parsed.state?.token === 'string' ? parsed.state.token : null;
  } catch {
    return null;
  }
}
