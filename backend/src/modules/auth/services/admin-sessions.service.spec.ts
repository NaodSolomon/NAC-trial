import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AdminRepository } from '../../admins/interfaces/admin-repository.interface';
import { AuthSessionRepository } from '../interfaces/auth-session-repository.interface';
import { AdminPrincipal } from '../interfaces/auth.types';
import { AdminSessionsService } from './admin-sessions.service';

const actor: AdminPrincipal = {
  id: '2876043c-a1cd-4de2-bf32-8db08a38f536',
  name: 'Super Administrator',
  email: 'super@example.org',
  role: 'SUPER_ADMIN',
};
const targetAdmin = {
  id: '98b88fd0-02d8-4bbc-b3c9-fd4ef490cd12',
  name: 'Content Editor',
  email: 'editor@example.org',
  passwordHash: 'hash',
  role: 'CONTENT_EDITOR' as const,
  isActive: true,
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AdminSessionsService', () => {
  let sessions: jest.Mocked<AuthSessionRepository>;
  let admins: jest.Mocked<AdminRepository>;
  let service: AdminSessionsService;

  beforeEach(() => {
    sessions = {
      create: jest.fn(),
      findById: jest.fn(),
      rotate: jest.fn(),
      revokeByTokenHash: jest.fn(),
      revokeFamily: jest.fn(),
      list: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllForAdmin: jest.fn(),
    };
    admins = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      recordFailedLogin: jest.fn(),
      recordSuccessfulLogin: jest.fn(),
    };
    service = new AdminSessionsService(sessions, admins);
  });

  it('passes pagination and status criteria through the repository boundary', async () => {
    sessions.list.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 2, limit: 10, totalPages: 0 },
    });

    await service.list({
      page: 2,
      limit: 10,
      offset: 10,
      status: 'expired',
      adminId: targetAdmin.id,
    });

    expect(sessions.list).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      offset: 10,
      status: 'expired',
      adminId: targetAdmin.id,
    });
  });

  it('requires exactly one revocation target', async () => {
    await expect(service.revoke({}, actor)).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.revoke({ sessionId: randomUUID(), adminId: targetAdmin.id }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(sessions.revokeSession).not.toHaveBeenCalled();
  });

  it('reports missing and already-revoked sessions with controlled errors', async () => {
    const sessionId = randomUUID();
    sessions.revokeSession
      .mockResolvedValueOnce('not_found')
      .mockResolvedValueOnce('already_revoked');

    await expect(service.revoke({ sessionId }, actor)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.revoke({ sessionId }, actor)).rejects.toBeInstanceOf(ConflictException);
  });

  it('revokes all sessions only after confirming the administrator exists', async () => {
    admins.findById.mockResolvedValue(targetAdmin);
    sessions.revokeAllForAdmin.mockResolvedValue(3);

    await expect(service.revoke({ adminId: targetAdmin.id }, actor)).resolves.toEqual({
      message: 'Administrator sessions revoked successfully',
      revokedCount: 3,
    });
    expect(sessions.revokeAllForAdmin).toHaveBeenCalledWith(targetAdmin.id, actor.id);
  });

  it('does not invoke revocation for a missing administrator', async () => {
    admins.findById.mockResolvedValue(null);

    await expect(service.revoke({ adminId: targetAdmin.id }, actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(sessions.revokeAllForAdmin).not.toHaveBeenCalled();
  });
});
