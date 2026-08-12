import { createContractApiClient } from './contract-client';
import { createApiClient } from './transport';

interface ServerApiClientOptions {
  accessToken?: string;
  headers?: HeadersInit;
}

const serverApiUrl =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export function createServerApiClient(options: ServerApiClientOptions = {}) {
  return createContractApiClient(
    createApiClient({
      baseUrl: serverApiUrl,
      defaultHeaders: options.headers,
      getAccessToken: () => options.accessToken ?? null,
      maxGetRetries: 2,
    }),
  );
}
