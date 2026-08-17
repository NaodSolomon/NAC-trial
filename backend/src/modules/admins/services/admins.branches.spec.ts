import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Admin } from '../../../database/schema';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { AdminManagementRepository } from '../interfaces/admin-management-repository.interface';
import { AdminRepository } from '../interfaces/admin-repository.interface';
import { AdminsService } from './admins.service';

const actor: AdminPrincipal = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Super Administrator',
  email: 'super@example.org',
  role: 'SUPER_ADMIN',
};

const storedAdmin = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Content Editor',
  email: 'editor@example.org',
  role: 'CONTENT_EDITOR',
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
} as unknown as Admin;

describe('AdminsService branch behaviour', () => {
  let admins: jest.Mocked<AdminRepository>;
  let management: jest.Mocked<AdminManagementRepository>;
  let service: AdminsService;

  beforeEach(() => {
    admins = { findById: jest.fn(), findByEmail: jest.fn() } as unknown as jest.Mocked<AdminRepository>;
    management = {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<AdminManagementRepository>;
    service = new AdminsService(admins, management);
  });

  it('maps every listed record onto the public view', async () => {
    management.list.mockResolvedValue({
      data: [storedAdmin],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    const result = await service.list({ page: 1, limit: 10, offset: 0 } as never);

    expect(result.data).toEqual([
      {
        id: storedAdmin.id,
        name: storedAdmin.name,
        email: storedAdmin.email,
        role: storedAdmin.role,
        isActive: storedAdmin.isActive,
        lastLoginAt: storedAdmin.lastLoginAt,
        createdAt: storedAdmin.createdAt,
        updatedAt: storedAdmin.updatedAt,
      },
    ]);
    expect(result.data[0]).not.toHaveProperty('passwordHash');
  });

  it('reports a missing administrator', async () => {
    admins.findById.mockResolvedValue(undefined as never);

    await expect(service.findOne(storedAdmin.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a found administrator as a view', async () => {
    admins.findById.mockResolvedValue(storedAdmin);

    await expect(service.findOne(storedAdmin.id)).resolves.toMatchObject({ id: storedAdmin.id });
  });

  describe('create', () => {
    const dto = {
      name: '  New Admin  ',
      email: '  NEW@Example.ORG ',
      password: 'StrongPassword123',
      role: 'CONTENT_EDITOR' as const,
    };

    it('normalises the name and email before persisting', async () => {
      management.create.mockResolvedValue(storedAdmin);

      await service.create(dto, actor);

      expect(management.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Admin', email: 'new@example.org' }),
        actor.id,
      );
      const [payload] = management.create.mock.calls[0];
      expect(payload.passwordHash).not.toBe(dto.password);
    });

    it('translates a direct unique violation into a conflict', async () => {
      management.create.mockRejectedValue({ code: '23505' });

      await expect(service.create(dto, actor)).rejects.toBeInstanceOf(ConflictException);
    });

    it('translates a wrapped unique violation into a conflict', async () => {
      management.create.mockRejectedValue({ cause: { code: '23505' } });

      await expect(service.create(dto, actor)).rejects.toBeInstanceOf(ConflictException);
    });

    it.each([
      ['a plain error', new Error('database offline')],
      ['a null rejection', null],
      ['a string rejection', 'boom'],
      ['an unrelated code', { code: '42P01' }],
      ['a non-object cause', { cause: 'nope' }],
      ['a null cause', { cause: null }],
      ['a cause without a code', { cause: {} }],
      ['a cause with another code', { cause: { code: '23503' } }],
    ])('rethrows %s untouched', async (_label, rejection) => {
      management.create.mockRejectedValue(rejection);

      await expect(service.create(dto, actor)).rejects.not.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('refuses an empty payload', async () => {
      await expect(service.update(storedAdmin.id, {}, actor)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(management.update).not.toHaveBeenCalled();
    });

    it('sends only the supplied fields and hashes a new password', async () => {
      management.update.mockResolvedValue({ status: 'updated', admin: storedAdmin });

      await service.update(
        storedAdmin.id,
        { name: '  Renamed  ', isActive: false, password: 'AnotherPassword123' },
        actor,
      );

      const [, patch] = management.update.mock.calls[0];
      expect(patch).toEqual(
        expect.objectContaining({ name: 'Renamed', isActive: false }),
      );
      expect(patch).not.toHaveProperty('role');
      expect(patch.passwordHash).not.toBe('AnotherPassword123');
    });

    it('passes a role change through on its own', async () => {
      management.update.mockResolvedValue({ status: 'updated', admin: storedAdmin });

      await service.update(storedAdmin.id, { role: 'FINANCE_VIEWER' }, actor);

      const [, patch] = management.update.mock.calls[0];
      expect(patch).toEqual({ role: 'FINANCE_VIEWER' });
    });

    it.each([
      ['not_found', NotFoundException],
      ['last_super_admin', ConflictException],
      ['conflict', ConflictException],
    ])('rejects the %s outcome', async (status, expected) => {
      management.update.mockResolvedValue({ status } as never);

      await expect(
        service.update(storedAdmin.id, { name: 'Renamed' }, actor),
      ).rejects.toBeInstanceOf(expected);
    });
  });

  describe('delete', () => {
    it('refuses self-deletion before reaching the repository', async () => {
      await expect(service.delete(actor.id, actor)).rejects.toBeInstanceOf(ConflictException);
      expect(management.delete).not.toHaveBeenCalled();
    });

    it('confirms a successful deletion', async () => {
      management.delete.mockResolvedValue({ status: 'deleted' } as never);

      await expect(service.delete(storedAdmin.id, actor)).resolves.toEqual({
        message: 'Administrator deleted successfully',
      });
    });

    it.each([
      ['not_found', NotFoundException],
      ['last_super_admin', ConflictException],
      ['conflict', ConflictException],
    ])('rejects the %s outcome', async (status, expected) => {
      management.delete.mockResolvedValue({ status } as never);

      await expect(service.delete(storedAdmin.id, actor)).rejects.toBeInstanceOf(expected);
    });
  });
});
