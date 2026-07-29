import { HttpException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Admin, AuthSession } from '../../../database/schema';
import { AdminRepository } from '../../admins/interfaces/admin-repository.interface';
import { AuthSessionRepository } from '../interfaces/auth-session-repository.interface';
import { TokenPair } from '../interfaces/auth.types';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

const now = new Date();
const admin: Admin = {
  id: '2a15a8e4-71c4-4bd0-b250-bc425b76fa8f',
  name: 'Super Admin',
  email: 'admin@example.com',
  passwordHash: '',
  role: 'SUPER_ADMIN',
  isActive: true,
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastLoginAt: null,
  createdAt: now,
  updatedAt: now,
};
const tokenPair: TokenPair = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresIn: 900,
  refreshExpiresAt: new Date(Date.now() + 86_400_000),
};
const context = {
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent',
};

describe('AuthService', () => {
  let admins: jest.Mocked<AdminRepository>;
  let sessions: jest.Mocked<AuthSessionRepository>;
  let tokens: jest.Mocked<TokenService>;
  let service: AuthService;

  beforeAll(async () => {
    admin.passwordHash = await bcrypt.hash('CorrectPassword1!', 4);
  });

  beforeEach(() => {
    admins = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      recordFailedLogin: jest.fn(),
      recordSuccessfulLogin: jest.fn(),
    };
    sessions = {
      create: jest.fn(),
      findById: jest.fn(),
      rotate: jest.fn(),
      revokeByTokenHash: jest.fn(),
      revokeFamily: jest.fn(),
    };
    tokens = {
      newIdentifier: jest
        .fn()
        .mockReturnValueOnce('52aa8e0d-99cf-4f9a-ad28-a5ec713922af')
        .mockReturnValueOnce('3d735e55-4f70-4cea-b841-cbb748b50cbc'),
      createTokenPair: jest.fn().mockResolvedValue(tokenPair),
      verifyRefreshToken: jest.fn(),
      hashToken: jest.fn().mockReturnValue('a'.repeat(64)),
      hashIpAddress: jest.fn().mockReturnValue('b'.repeat(64)),
    } as unknown as jest.Mocked<TokenService>;

    service = new AuthService(admins, sessions, tokens);
  });

  it('authenticates an active administrator and creates a hashed session', async () => {
    admins.findByEmail.mockResolvedValue(admin);

    const result = await service.login(
      {
        email: ' ADMIN@example.com ',
        password: 'CorrectPassword1!',
      },
      context,
    );

    expect(admins.findByEmail).toHaveBeenCalledWith('admin@example.com');
    expect(admins.recordSuccessfulLogin).toHaveBeenCalledWith(admin.id);
    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: admin.id,
        tokenHash: 'a'.repeat(64),
        ipHash: 'b'.repeat(64),
      }),
    );
    expect(result.admin).not.toHaveProperty('passwordHash');
    expect(result.accessToken).toBe(tokenPair.accessToken);
  });

  it('records a failed login without revealing whether the account exists', async () => {
    admins.findByEmail.mockResolvedValue(admin);

    await expect(
      service.login(
        {
          email: admin.email,
          password: 'IncorrectPassword1!',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(admins.recordFailedLogin).toHaveBeenCalledWith(admin.id);
  });

  it('rejects a locked administrator even when the password is correct', async () => {
    admins.findByEmail.mockResolvedValue({
      ...admin,
      lockedUntil: new Date(Date.now() + 60_000),
    });

    await expect(
      service.login(
        {
          email: admin.email,
          password: 'CorrectPassword1!',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(HttpException);

    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('rotates a valid refresh token within its token family', async () => {
    const session: AuthSession = {
      id: '52aa8e0d-99cf-4f9a-ad28-a5ec713922af',
      adminId: admin.id,
      tokenHash: 'a'.repeat(64),
      tokenFamilyId: '3d735e55-4f70-4cea-b841-cbb748b50cbc',
      userAgent: null,
      ipHash: null,
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: null,
      revokedAt: null,
      createdAt: now,
    };
    tokens.verifyRefreshToken.mockResolvedValue({
      sub: admin.id,
      sid: session.id,
      fid: session.tokenFamilyId,
      type: 'refresh',
    });
    sessions.findById.mockResolvedValue(session);
    admins.findById.mockResolvedValue(admin);
    sessions.rotate.mockResolvedValue({
      ...session,
      id: 'new-session-id',
    });

    const result = await service.refresh('old-refresh-token', context);

    expect(sessions.rotate).toHaveBeenCalled();
    expect(result.refreshToken).toBe(tokenPair.refreshToken);
  });

  it('revokes a refresh token during logout', async () => {
    await expect(service.logout('refresh-token')).resolves.toEqual({
      message: 'Logged out successfully',
    });
    expect(sessions.revokeByTokenHash).toHaveBeenCalledWith('a'.repeat(64));
  });
});
