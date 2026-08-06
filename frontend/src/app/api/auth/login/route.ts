import { NextRequest, NextResponse } from 'next/server';
import { forwardAuthentication, readRequestBody } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await readRequestBody(request);
  if (body === undefined) {
    return NextResponse.json(
      { success: false, statusCode: 400, message: 'A valid JSON body is required.' },
      { status: 400 },
    );
  }
  return forwardAuthentication(request, '/auth/login', body);
}
