import { ApiRequestError, apiErrorFromResponse } from './errors';

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  statusCode: number;
  timestamp: string;
}

export interface ApiRequestOptions {
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeoutMs?: number;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
}

interface ApiClientConfiguration {
  baseUrl: string;
  credentials?: RequestCredentials;
  defaultHeaders?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  getAccessToken?: () => string | null | Promise<string | null>;
  refreshAccessToken?: () => Promise<string | null>;
  fetchImplementation?: typeof fetch;
  maxGetRetries?: number;
  retryDelayMs?: number;
}

export interface ApiClient {
  get<T>(path: string, options?: Omit<ApiRequestOptions, 'body'>): Promise<T>;
  post<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'body'>): Promise<T>;
  put<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'body'>): Promise<T>;
  patch<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'body'>): Promise<T>;
  delete<T>(path: string, options?: ApiRequestOptions): Promise<T>;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const retryableStatuses = new Set([429, 502, 503, 504]);

export function createApiClient(configuration: ApiClientConfiguration): ApiClient {
  const request = <T>(method: HttpMethod, path: string, options: ApiRequestOptions = {}) =>
    executeRequest<T>(configuration, method, path, options);

  return {
    get: (path, options) => request('GET', path, options),
    post: (path, body, options) => request('POST', path, { ...options, body }),
    put: (path, body, options) => request('PUT', path, { ...options, body }),
    patch: (path, body, options) => request('PATCH', path, { ...options, body }),
    delete: (path, options) => request('DELETE', path, options),
  };
}

async function executeRequest<T>(
  configuration: ApiClientConfiguration,
  method: HttpMethod,
  path: string,
  options: ApiRequestOptions,
  accessReplayAttempted = false,
): Promise<T> {
  const fetchImplementation = configuration.fetchImplementation ?? fetch;
  const maxRetries = method === 'GET' ? Math.max(0, configuration.maxGetRetries ?? 2) : 0;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (options.signal?.aborted) throw cancelledRequestError(options.signal.reason);
    const attemptControl = createAttemptControl(options.signal, options.timeoutMs ?? 10_000);

    try {
      const headers = await buildHeaders(configuration, options.headers, options.body);
      const response = await fetchImplementation(buildUrl(configuration.baseUrl, path), {
        method,
        headers,
        body: serializeBody(options.body),
        credentials: configuration.credentials,
        signal: attemptControl.signal,
        cache: options.cache,
        next: options.next,
      });
      const payload = await parseResponse(response);

      if (!response.ok) {
        if (response.status === 401 && !accessReplayAttempted && configuration.refreshAccessToken) {
          const replacement = await configuration.refreshAccessToken();
          if (replacement) {
            return executeRequest<T>(configuration, method, path, options, true);
          }
        }
        if (attempt < maxRetries && retryableStatuses.has(response.status)) {
          await retryDelay(response, attempt, configuration.retryDelayMs ?? 200, options.signal);
          continue;
        }
        throw apiErrorFromResponse(response.status, payload);
      }

      if (!isSuccessEnvelope<T>(payload)) {
        throw new ApiRequestError({
          kind: 'CONTRACT',
          status: response.status,
          message: 'The server returned an unexpected response. Please try again.',
        });
      }

      return payload.data;
    } catch (error) {
      if (error instanceof ApiRequestError) throw error;
      if (options.signal?.aborted) {
        throw cancelledRequestError(error);
      }
      if (attemptControl.timedOut()) {
        if (attempt < maxRetries) {
          await retryDelay(undefined, attempt, configuration.retryDelayMs ?? 200, options.signal);
          continue;
        }
        throw new ApiRequestError({
          kind: 'TIMEOUT',
          status: 0,
          message: 'The service took too long to respond. Please try again.',
          cause: error,
        });
      }
      if (attempt < maxRetries) {
        await retryDelay(undefined, attempt, configuration.retryDelayMs ?? 200, options.signal);
        continue;
      }
      throw new ApiRequestError({
        kind: 'NETWORK',
        status: 0,
        message: 'The service could not be reached. Check your connection and try again.',
        cause: error,
      });
    } finally {
      attemptControl.cleanup();
    }
  }

  throw new ApiRequestError({
    kind: 'UNKNOWN',
    status: 0,
    message: 'The request could not be completed.',
  });
}

async function buildHeaders(
  configuration: ApiClientConfiguration,
  requestHeaders: HeadersInit | undefined,
  body: unknown,
) {
  const configuredHeaders =
    typeof configuration.defaultHeaders === 'function'
      ? await configuration.defaultHeaders()
      : configuration.defaultHeaders;
  const headers = new Headers(configuredHeaders);
  new Headers(requestHeaders).forEach((value, key) => headers.set(key, value));

  if (body !== undefined && isJsonBody(body) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  headers.set('accept', 'application/json');

  const accessToken = await configuration.getAccessToken?.();
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  return headers;
}

function buildUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (isJsonBody(body)) return JSON.stringify(body);
  return body as BodyInit;
}

function isJsonBody(body: unknown) {
  return !(
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  );
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return { success: true, data: undefined, statusCode: 204, timestamp: '' };
  }
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function isSuccessEnvelope<T>(payload: unknown): payload is ApiSuccessEnvelope<T> {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Partial<ApiSuccessEnvelope<T>>;
  return candidate.success === true && 'data' in candidate;
}

function createAttemptControl(externalSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timeoutReached = false;
  const abortFromCaller = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) {
    abortFromCaller();
  } else {
    externalSignal?.addEventListener('abort', abortFromCaller, { once: true });
  }
  const timeout = setTimeout(
    () => {
      timeoutReached = true;
      controller.abort();
    },
    Math.max(1, timeoutMs),
  );

  return {
    signal: controller.signal,
    timedOut: () => timeoutReached,
    cleanup: () => {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abortFromCaller);
    },
  };
}

async function retryDelay(
  response: Response | undefined,
  attempt: number,
  baseDelayMs: number,
  signal: AbortSignal | undefined,
) {
  if (signal?.aborted) throw cancelledRequestError(signal.reason);
  const retryAfter = parseRetryAfter(response?.headers.get('retry-after'));
  const delayMs = Math.min(retryAfter ?? baseDelayMs * 2 ** attempt, 2_000);
  if (delayMs <= 0) return;

  await new Promise<void>((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener('abort', abort);
      resolve();
    };
    const timer = setTimeout(finish, delayMs);
    const abort = () => {
      clearTimeout(timer);
      reject(cancelledRequestError(signal?.reason));
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

function cancelledRequestError(cause?: unknown) {
  return new ApiRequestError({
    kind: 'CANCELLED',
    status: 0,
    message: 'The request was cancelled.',
    cause,
  });
}

function parseRetryAfter(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}
