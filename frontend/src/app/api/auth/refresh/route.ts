import { NextRequest, NextResponse } from 'next/server';
import { refreshCookieName } from '@/lib/auth/constants';
import { forwardAuthentication } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get(refreshCookieName)?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { success: false, statusCode: 401, message: 'Authentication is required.' },
      { status: 401 },
    );
  }
  return forwardAuthentication(request, '/auth/refresh', { refreshToken });
}
