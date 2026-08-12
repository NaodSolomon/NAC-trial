import { API_URL } from '@/lib/constants';
import { getAccessToken, refreshAccessToken } from '@/lib/auth';
import { createContractApiClient } from './contract-client';
import { createApiClient } from './transport';

export const browserApiClient = createContractApiClient(
  createApiClient({
    baseUrl: API_URL,
    credentials: 'include',
    getAccessToken,
    refreshAccessToken,
    maxGetRetries: 2,
  }),
);
