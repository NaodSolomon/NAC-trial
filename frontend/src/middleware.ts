import { NextRequest, NextResponse } from 'next/server';
import { refreshCookieName } from '@/lib/auth/constants';
import {
  documentLanguageHeaderName,
  languageCookieName,
  normalizeLanguage,
  resolveDocumentLanguage,
} from '@/lib/i18n/config';

const publicAdminRoutes = new Set([
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password',
]);

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (pathname === '/team' || pathname.startsWith('/team/')) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'x-robots-tag': 'noindex, nofollow',
      },
    });
  }
  const queryLanguage = normalizeLanguage(request.nextUrl.searchParams.get('lang'));
  const documentLanguage = resolveDocumentLanguage(
    pathname,
    queryLanguage,
    request.cookies.get(languageCookieName)?.value,
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(documentLanguageHeaderName, documentLanguage);

  if (!isAdminRoute(pathname)) {
    if (queryLanguage) {
      request.cookies.set(languageCookieName, queryLanguage);
      requestHeaders.set('cookie', request.cookies.toString());
    }
    return persistPublicLanguage(
      NextResponse.next({ request: { headers: requestHeaders } }),
      queryLanguage,
    );
  }

  if (publicAdminRoutes.has(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  if (request.cookies.has(refreshCookieName)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const login = new URL('/admin/login', request.url);
  login.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};

function isAdminRoute(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function persistPublicLanguage(response: NextResponse, language: 'en' | 'am' | undefined) {
  if (language) {
    response.cookies.set(languageCookieName, language, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
    });
  }
  return response;
}
