import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Admin } from '../../../database/schema';
import { TokenService } from './token.service';

describe('TokenService', () => {
  const config = new ConfigService({
    jwt: {
      accessSecret: 'test-access-secret-with-at-least-32-characters',
      refreshSecret: 'test-refresh-secret-with-at-least-32-characters',
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      issuer: 'test-issuer',
      audience: 'test-audience',
      ipHashSecret: 'test-ip-secret-with-at-least-32-characters',
    },
  });
  const service = new TokenService(new JwtService(), config);
  const admin: Admin = {
    id: '2a15a8e4-71c4-4bd0-b250-bc425b76fa8f',
    name: 'Super Admin',
    email: 'admin@example.com',
    passwordHash: 'not-returned',
    role: 'SUPER_ADMIN',
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('creates independently signed access and refresh JWTs', async () => {
    const tokens = await service.createTokenPair(
      admin,
      '52aa8e0d-99cf-4f9a-ad28-a5ec713922af',
      '3d735e55-4f70-4cea-b841-cbb748b50cbc',
    );
    const refreshPayload = await service.verifyRefreshToken(tokens.refreshToken);

    expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    expect(tokens.expiresIn).toBe(900);
    expect(refreshPayload).toMatchObject({
      sub: admin.id,
      type: 'refresh',
    });
  });

  it('hashes tokens and IP addresses without storing their raw values', () => {
    expect(service.hashToken('secret-token')).toHaveLength(64);
    expect(service.hashToken('secret-token')).not.toContain('secret-token');
    expect(service.hashIpAddress('127.0.0.1')).toHaveLength(64);
  });
});
