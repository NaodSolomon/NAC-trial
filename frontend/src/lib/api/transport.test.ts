import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from './errors';
import { createApiClient } from './transport';

describe('API transport', () => {
  it('unwraps the backend success envelope', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        success: true,
        data: { id: 'event-1' },
        statusCode: 200,
        timestamp: '2026-08-06T00:00:00.000Z',
      }),
    );
    const client = testClient(fetchImplementation);

    await expect(client.get<{ id: string }>('/public/events/event-1')).resolves.toEqual({
      id: 'event-1',
    });
  });

  it('retries a safe GET within the configured bound', async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          success: true,
          data: ['ready'],
          statusCode: 200,
          timestamp: '2026-08-06T00:00:00.000Z',
        }),
      );
    const client = testClient(fetchImplementation);

    await expect(client.get<string[]>('/public/events')).resolves.toEqual(['ready']);
    expect(fetchImplementation).toHaveBeenCalledTimes(3);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
    'never retries a destructive %s request',
    async (method) => {
      const fetchImplementation = vi.fn().mockResolvedValue(errorResponse(503));
      const client = testClient(fetchImplementation);
      const request =
        method === 'DELETE'
          ? client.delete('/admin/resource/1')
          : client[method.toLowerCase() as 'post' | 'put' | 'patch']('/admin/resource/1', {});

      await expect(request).rejects.toMatchObject({ kind: 'UNAVAILABLE', status: 503 });
      expect(fetchImplementation).toHaveBeenCalledTimes(1);
    },
  );

  it('does not retry validation or authorization failures', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(errorResponse(400));
    const client = testClient(fetchImplementation);

    await expect(client.get('/public/search')).rejects.toMatchObject({ kind: 'VALIDATION' });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it('honors caller cancellation', async () => {
    const fetchImplementation = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const rejectAbort = () => reject(new DOMException('Aborted', 'AbortError'));
          if (init?.signal?.aborted) {
            rejectAbort();
          } else {
            init?.signal?.addEventListener('abort', rejectAbort, { once: true });
          }
        }),
    );
    const client = testClient(fetchImplementation);
    const controller = new AbortController();
    const request = client.get('/public/events', { signal: controller.signal });
    controller.abort();

    await expect(request).rejects.toEqual(
      expect.objectContaining<Partial<ApiRequestError>>({ kind: 'CANCELLED', status: 0 }),
    );
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending retry backoff without issuing another request', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(errorResponse(503));
    const client = createApiClient({
      baseUrl: 'http://localhost:8000/api/v1',
      fetchImplementation: fetchImplementation as typeof fetch,
      maxGetRetries: 2,
      retryDelayMs: 2_000,
    });
    const controller = new AbortController();
    const request = client.get('/public/events', { signal: controller.signal });
    await vi.waitFor(() => expect(fetchImplementation).toHaveBeenCalledTimes(1));
    controller.abort();

    await expect(request).rejects.toMatchObject({ kind: 'CANCELLED', status: 0 });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });
});

function testClient(fetchImplementation: ReturnType<typeof vi.fn>) {
  return createApiClient({
    baseUrl: 'http://localhost:8000/api/v1',
    fetchImplementation: fetchImplementation as typeof fetch,
    maxGetRetries: 2,
    retryDelayMs: 0,
  });
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function errorResponse(status: number) {
  return jsonResponse(status, {
    success: false,
    statusCode: status,
    message: 'Server detail',
    timestamp: '2026-08-06T00:00:00.000Z',
  });
}
