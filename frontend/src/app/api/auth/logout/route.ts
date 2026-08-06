import { NextRequest, NextResponse } from 'next/server';
import { refreshCookieName } from '@/lib/auth/constants';
import {
  backendRequest,
  clearRefreshCookie,
  proxyResponse,
  readPayload,
} from '@/lib/auth/server-auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let refreshToken = request.cookies.get(refreshCookieName)?.value;
  let accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!refreshToken) {
    const response = NextResponse.json({ success: true, data: { message: 'Logged out.' } });
    clearRefreshCookie(response);
    return response;
  }

  try {
    if (!accessToken) {
      const refreshResponse = await backendRequest(request, '/auth/refresh', {
        body: { refreshToken },
      });
      const refreshPayload = await readPayload(refreshResponse);
      if (!refreshResponse.ok && refreshResponse.status !== 401) {
        const response = proxyResponse(refreshPayload, refreshResponse.status);
        clearRefreshCookie(response);
        return response;
      }
      if (refreshResponse.ok && isRefreshPayload(refreshPayload)) {
        accessToken = refreshPayload.data.accessToken;
        refreshToken = refreshPayload.data.refreshToken;
      } else if (refreshResponse.ok) {
        throw new Error('Invalid authentication response');
      }
    }

    const upstream = accessToken
      ? await backendRequest(request, '/auth/logout', {
          accessToken,
          body: { refreshToken },
        })
      : undefined;
    const payload = upstream
      ? await readPayload(upstream)
      : { success: true, data: { message: 'Logged out.' } };
    const response = proxyResponse(payload, upstream?.status ?? 200);
    clearRefreshCookie(response);
    return response;
  } catch {
    const response = NextResponse.json(
      {
        success: false,
        statusCode: 503,
        message: 'The backend session could not be revoked. Please sign in and try again.',
      },
      { status: 503 },
    );
    clearRefreshCookie(response);
    return response;
  }
}

function isRefreshPayload(value: unknown): value is {
  data: { accessToken: string; refreshToken: string };
} {
  if (!value || typeof value !== 'object') return false;
  const data = (value as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return false;
  const tokens = data as Record<string, unknown>;
  return typeof tokens.accessToken === 'string' && typeof tokens.refreshToken === 'string';
}
