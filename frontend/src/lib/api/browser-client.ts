import { API_URL } from '@/lib/constants';
import { getAccessToken, refreshAccessToken } from '@/lib/auth';
import { createApiClient } from './transport';

export const browserApiClient = createApiClient({
  baseUrl: API_URL,
  credentials: 'include',
  getAccessToken,
  refreshAccessToken,
  maxGetRetries: 2,
});
