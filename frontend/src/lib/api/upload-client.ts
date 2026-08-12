'use client';

import { API_URL } from '@/lib/constants';
import { getAccessToken, refreshAccessToken } from '@/lib/auth';
import type { ContractRequestPath } from './contract-client';
import { ApiRequestError, apiErrorFromResponse } from './errors';

interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

export async function uploadFormData<
  T,
  Path extends ContractRequestPath<'post'> = ContractRequestPath<'post'>,
>(
  path: Path,
  formData: FormData,
  options: {
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  return executeUpload(path, formData, options, false);
}

async function executeUpload<T>(
  path: string,
  formData: FormData,
  options: { onProgress?: (percent: number) => void; signal?: AbortSignal; timeoutMs?: number },
  replayed: boolean,
): Promise<T> {
  const response = await xhrUpload(path, formData, options);
  if (response.status === 401 && !replayed && (await refreshAccessToken())) {
    return executeUpload(path, formData, options, true);
  }
  if (response.status < 200 || response.status >= 300) {
    throw apiErrorFromResponse(response.status, response.payload);
  }
  if (!isSuccessEnvelope<T>(response.payload)) {
    throw new ApiRequestError({
      kind: 'CONTRACT',
      status: response.status,
      message: 'The upload service returned an unexpected response.',
    });
  }
  options.onProgress?.(100);
  return response.payload.data;
}

function xhrUpload(
  path: string,
  formData: FormData,
  options: { onProgress?: (percent: number) => void; signal?: AbortSignal; timeoutMs?: number },
): Promise<{ status: number; payload: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL.replace(/\/$/, '')}${path}`);
    xhr.timeout = options.timeoutMs ?? 60_000;
    xhr.setRequestHeader('accept', 'application/json');
    const token = getAccessToken();
    if (token) xhr.setRequestHeader('authorization', `Bearer ${token}`);
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable)
        options.onProgress?.(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener('load', () =>
      resolve({ status: xhr.status, payload: parseJson(xhr.responseText) }),
    );
    xhr.addEventListener('error', () =>
      reject(
        new ApiRequestError({
          kind: 'NETWORK',
          status: 0,
          message: 'The upload service could not be reached.',
        }),
      ),
    );
    xhr.addEventListener('timeout', () =>
      reject(
        new ApiRequestError({
          kind: 'TIMEOUT',
          status: 0,
          message: 'The upload took too long and was cancelled.',
        }),
      ),
    );
    xhr.addEventListener('abort', () =>
      reject(
        new ApiRequestError({ kind: 'CANCELLED', status: 0, message: 'The upload was cancelled.' }),
      ),
    );
    const abort = () => xhr.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    xhr.addEventListener('loadend', () => options.signal?.removeEventListener('abort', abort));
    xhr.send(formData);
  });
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
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
