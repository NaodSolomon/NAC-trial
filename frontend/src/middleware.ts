import { NextRequest, NextResponse } from 'next/server';
import { refreshCookieName } from '@/lib/auth/constants';

const publicAdminRoutes = new Set([
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password',
]);

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (publicAdminRoutes.has(pathname)) return NextResponse.next();
  if (request.cookies.has(refreshCookieName)) return NextResponse.next();

  const login = new URL('/admin/login', request.url);
  login.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/admin/:path*'],
};
