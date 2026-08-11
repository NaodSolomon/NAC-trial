'use client';

import { API_URL } from '@/lib/constants';
import { getAccessToken, refreshAccessToken } from '@/lib/auth';
import { ApiRequestError, apiErrorFromResponse } from './errors';

export async function downloadAuthenticatedFile(
  path: string,
  fallbackName: string,
  replayed = false,
): Promise<void> {
  const token = getAccessToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL.replace(/\/$/, '')}${path}`, {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      credentials: 'include',
      signal: AbortSignal.timeout(15_000),
    });
  } catch (cause) {
    throw new ApiRequestError({
      kind: 'NETWORK',
      status: 0,
      message: 'The file could not be downloaded.',
      cause,
    });
  }
  if (response.status === 401 && !replayed && (await refreshAccessToken())) {
    return downloadAuthenticatedFile(path, fallbackName, true);
  }
  if (!response.ok) {
    throw apiErrorFromResponse(response.status, await parsePayload(response));
  }
  const blob = await response.blob();
  const filename = filenameFromHeader(response.headers.get('content-disposition')) ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function filenameFromHeader(value: string | null): string | null {
  const match = value?.match(/filename="?([^";]+)"?/i);
  return match?.[1]?.replaceAll(/[\\/]/g, '_') ?? null;
}

async function parsePayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
