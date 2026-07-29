import { ConflictException } from '@nestjs/common';
import { Admin } from '../../../database/schema';
import { AdminRepository } from '../interfaces/admin-repository.interface';
import { AdminManagementRepository } from '../interfaces/admin-management-repository.interface';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { AdminsService } from './admins.service';

const now = new Date();
const actor: AdminPrincipal = {
  id: '2a15a8e4-71c4-4bd0-b250-bc425b76fa8f',
  name: 'Super Admin',
  email: 'owner@example.com',
  role: 'SUPER_ADMIN',
};
const managedAdmin: Admin = {
  id: '78b95418-fea7-4468-96f8-e14aff96ac72',
  name: 'Content Editor',
  email: 'editor@example.com',
  passwordHash: 'secret-hash',
  role: 'CONTENT_EDITOR',
  isActive: true,
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastLoginAt: null,
  createdAt: now,
  updatedAt: now,
};

describe('AdminsService', () => {
  let admins: jest.Mocked<AdminRepository>;
  let management: jest.Mocked<AdminManagementRepository>;
  let service: AdminsService;

  beforeEach(() => {
    admins = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      recordFailedLogin: jest.fn(),
      recordSuccessfulLogin: jest.fn(),
    };
    management = {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new AdminsService(admins, management);
  });

  it('never exposes password or lockout fields in list responses', async () => {
    management.list.mockResolvedValue({
      data: [managedAdmin],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });

    const result = await service.list({
      page: 1,
      limit: 20,
      sortOrder: 'desc',
      offset: 0,
    });

    expect(result.data[0]).not.toHaveProperty('passwordHash');
    expect(result.data[0]).not.toHaveProperty('failedLoginAttempts');
    expect(result.data[0]).not.toHaveProperty('lockedUntil');
  });

  it('hashes a new administrator password before persistence', async () => {
    management.create.mockImplementation(async (data) => ({
      ...managedAdmin,
      ...data,
    }));

    await service.create(
      {
        name: managedAdmin.name,
        email: 'EDITOR@EXAMPLE.COM',
        password: 'StrongPassword1',
        role: 'CONTENT_EDITOR',
      },
      actor,
    );

    expect(management.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'editor@example.com',
        passwordHash: expect.not.stringContaining('StrongPassword1'),
      }),
      actor.id,
    );
  });

  it('blocks changes that would remove the final active super administrator', async () => {
    management.update.mockResolvedValue({ status: 'last_super_admin' });

    await expect(
      service.update(managedAdmin.id, { role: 'CONTENT_EDITOR' }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks self-deletion before reaching the repository', async () => {
    await expect(service.delete(actor.id, actor)).rejects.toBeInstanceOf(ConflictException);
    expect(management.delete).not.toHaveBeenCalled();
  });
});
