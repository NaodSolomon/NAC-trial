import { NextRequest, NextResponse } from 'next/server';
import { refreshCookieName, type BrowserAuthSession } from './constants';

const backendApiUrl =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
const refreshCookieMaxAge = Number(process.env.REFRESH_COOKIE_MAX_AGE_SECONDS ?? 7 * 24 * 60 * 60);

interface BackendAuthenticationResponse extends BrowserAuthSession {
  refreshToken: string;
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  statusCode: number;
  timestamp: string;
}

export async function forwardAuthentication(
  request: NextRequest,
  backendPath: '/auth/login' | '/auth/refresh',
  body: unknown,
): Promise<NextResponse> {
  let upstream: Response;
  try {
    upstream = await backendRequest(request, backendPath, { body });
  } catch {
    return NextResponse.json(
      {
        success: false,
        statusCode: 503,
        message: 'Authentication service is temporarily unavailable.',
      },
      { status: 503 },
    );
  }
  const payload = await readPayload(upstream);
  if (!upstream.ok || !isAuthenticationEnvelope(payload)) {
    return proxyResponse(payload, upstream.status);
  }

  const { refreshToken, ...browserSession } = payload.data;
  const response = NextResponse.json(
    { ...payload, data: browserSession },
    { status: upstream.status },
  );
  setRefreshCookie(response, refreshToken);
  return response;
}

export async function backendRequest(
  request: NextRequest,
  path: string,
  options: { body?: unknown; accessToken?: string } = {},
): Promise<Response> {
  const headers = new Headers({ accept: 'application/json', 'content-type': 'application/json' });
  const userAgent = request.headers.get('user-agent');
  if (userAgent) headers.set('user-agent', userAgent);
  if (options.accessToken) headers.set('authorization', `Bearer ${options.accessToken}`);

  return fetch(`${backendApiUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`, {
    method: 'POST',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
}

export async function readRequestBody(request: NextRequest): Promise<unknown | undefined> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export async function readPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {
      success: false,
      statusCode: response.status || 503,
      message: 'Authentication service returned an invalid response.',
    };
  }
}

export function proxyResponse(payload: unknown, status: number): NextResponse {
  return NextResponse.json(payload, { status: status || 503 });
}

export function clearRefreshCookie(response: NextResponse): void {
  response.cookies.set(refreshCookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

function setRefreshCookie(response: NextResponse, refreshToken: string): void {
  response.cookies.set(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: Number.isFinite(refreshCookieMaxAge) ? refreshCookieMaxAge : 7 * 24 * 60 * 60,
  });
}

function isAuthenticationEnvelope(
  value: unknown,
): value is SuccessEnvelope<BackendAuthenticationResponse> {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as { success?: unknown; data?: unknown };
  if (envelope.success !== true || !envelope.data || typeof envelope.data !== 'object')
    return false;
  const data = envelope.data as Record<string, unknown>;
  return (
    typeof data.accessToken === 'string' &&
    typeof data.refreshToken === 'string' &&
    typeof data.expiresIn === 'number' &&
    isAdminPrincipal(data.admin)
  );
}

function isAdminPrincipal(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const admin = value as Record<string, unknown>;
  return (
    typeof admin.id === 'string' &&
    typeof admin.email === 'string' &&
    typeof admin.name === 'string' &&
    (admin.role === 'SUPER_ADMIN' ||
      admin.role === 'CONTENT_EDITOR' ||
      admin.role === 'FINANCE_VIEWER')
  );
}
