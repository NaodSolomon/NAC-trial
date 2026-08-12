import { describe, expect, it, vi } from 'vitest';
import { createContractApiClient } from './contract-client';
import type { ApiClient } from './transport';

describe('OpenAPI contract client', () => {
  it('delegates a generated path and method to the transport', async () => {
    const get = vi.fn().mockResolvedValue({ title: 'Home' });
    const client = createContractApiClient({ get } as unknown as ApiClient);

    await expect(
      client.get('/public/content/homepage?languageCode=en'),
    ).resolves.toEqual({ title: 'Home' });
    expect(get).toHaveBeenCalledWith('/public/content/homepage?languageCode=en', undefined);
  });

  it('retains the explicitly bounded trial-payment exception', async () => {
    const post = vi.fn().mockResolvedValue({ status: 'CONFIRMED' });
    const client = createContractApiClient({ post } as unknown as ApiClient);

    await client.post('/test/payments/00000000-0000-4000-8000-000000000001/confirm');

    expect(post).toHaveBeenCalledOnce();
  });

  it('rejects path and method combinations absent from OpenAPI at compile time', () => {
    const client = createContractApiClient({} as ApiClient);

    if (false) {
      // @ts-expect-error public search has no POST operation in the generated contract.
      void client.post('/public/search');
      // @ts-expect-error no backend route is registered at this path.
      void client.get('/public/not-a-real-route');
    }

    expect(client).toBeDefined();
  });
});
