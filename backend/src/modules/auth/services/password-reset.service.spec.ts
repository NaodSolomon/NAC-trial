import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { AdminRepository } from '../../admins/interfaces/admin-repository.interface';
import { PasswordResetMailerService } from '../../mail/password-reset-mailer.service';
import { PasswordResetRepository } from '../interfaces/password-reset-repository.interface';
import { PasswordResetService } from './password-reset.service';

const genericResponse = {
  message: 'If the account exists, password reset instructions have been sent.',
};
const admin = {
  id: '10ea5a91-2840-43c7-92ac-0c5722646b0b',
  name: 'Administrator',
  email: 'admin@example.org',
  passwordHash: 'existing-hash',
  role: 'SUPER_ADMIN' as const,
  isActive: true,
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PasswordResetService', () => {
  let admins: jest.Mocked<AdminRepository>;
  let resets: jest.Mocked<PasswordResetRepository>;
  let mailer: jest.Mocked<PasswordResetMailerService>;
  let service: PasswordResetService;

  beforeEach(() => {
    admins = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      recordFailedLogin: jest.fn(),
      recordSuccessfulLogin: jest.fn(),
    };
    resets = {
      createResetToken: jest.fn().mockImplementation(async (token) => ({
        id: 'b73c3659-c33c-4938-8478-600899d6f15c',
        usedAt: null,
        createdAt: new Date(),
        ...token,
      })),
      consumeResetTokenAndChangePassword: jest.fn(),
      invalidateOutstandingTokens: jest.fn(),
      invalidateResetToken: jest.fn(),
    };
    mailer = { send: jest.fn() } as unknown as jest.Mocked<PasswordResetMailerService>;
    const config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'mail.passwordResetTtlMinutes') return 20;
        throw new Error(`Unexpected config key ${key}`);
      }),
    } as unknown as ConfigService;
    service = new PasswordResetService(admins, resets, mailer, config);
  });

  it('returns identical public responses for existing and nonexistent accounts', async () => {
    admins.findByEmail.mockResolvedValueOnce(admin).mockResolvedValueOnce(null);

    await expect(service.request(' ADMIN@example.org ')).resolves.toEqual(genericResponse);
    await expect(service.request('missing@example.org')).resolves.toEqual(genericResponse);
    expect(resets.createResetToken).toHaveBeenCalledTimes(1);
    expect(mailer.send).toHaveBeenCalledTimes(1);
  });

  it('stores only the SHA-256 token hash and gives the raw token only to the mailer', async () => {
    admins.findByEmail.mockResolvedValue(admin);

    await service.request(admin.email);

    const rawToken = mailer.send.mock.calls[0][1];
    const persisted = resets.createResetToken.mock.calls[0][0];
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted.tokenHash).toBe(createHash('sha256').update(rawToken).digest('hex'));
    expect(persisted.tokenHash).not.toBe(rawToken);
    expect(persisted.expiresAt.getTime()).toBeGreaterThan(Date.now() + 19 * 60_000);
  });

  it('invalidates exactly the issued token when SMTP delivery fails', async () => {
    admins.findByEmail.mockResolvedValue(admin);
    mailer.send.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(service.request(admin.email)).resolves.toEqual(genericResponse);

    const tokenHash = resets.createResetToken.mock.calls[0][0].tokenHash;
    expect(resets.invalidateResetToken).toHaveBeenCalledWith(tokenHash);
  });

  it('changes the password through the repository using a token hash', async () => {
    resets.consumeResetTokenAndChangePassword.mockResolvedValue({
      status: 'consumed',
      adminId: admin.id,
      revokedSessionCount: 2,
    });
    const token = 'a'.repeat(64);

    await expect(service.confirm({ token, newPassword: 'NewStrongPassword123' })).resolves.toEqual({
      message: 'Password has been reset successfully.',
    });

    const [tokenHash, passwordHash] = resets.consumeResetTokenAndChangePassword.mock.calls[0];
    expect(tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(passwordHash).not.toContain('NewStrongPassword123');
  });

  it('uses the same generic error for invalid, expired, and consumed tokens', async () => {
    resets.consumeResetTokenAndChangePassword.mockResolvedValue({ status: 'invalid' });

    await expect(
      service.confirm({ token: 'b'.repeat(64), newPassword: 'NewStrongPassword123' }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<BadRequestException>>({
        message: 'Password reset token is invalid or expired',
      }),
    );
  });
});
