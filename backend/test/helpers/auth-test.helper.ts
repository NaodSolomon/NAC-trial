import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TokenPair } from '../../src/modules/auth/interfaces/auth.types';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TestSession extends LoginResponse {
  authorization: string;
}

export function bearerAuthorization(accessToken: string): string {
  return `Bearer ${accessToken}`;
}

export async function authenticatedSession(
  app: INestApplication,
  email: string,
  password: string,
): Promise<TestSession> {
  const tokens = await loginForTest(app, { email, password });
  return { ...tokens, authorization: bearerAuthorization(tokens.accessToken) };
}

export async function loginForTest(
  app: INestApplication,
  credentials: { email: string; password: string },
): Promise<LoginResponse> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send(credentials)
    .expect(200);

  return response.body.data as LoginResponse;
}

export function tokenPairFactory(overrides: Partial<TokenPair> = {}): TokenPair {
  return {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresIn: 900,
    refreshExpiresAt: new Date('2026-01-08T00:00:00.000Z'),
    ...overrides,
  };
}
