import { AuthSession } from '../../src/database/schema';
import { AdminPrincipal } from '../../src/modules/auth/interfaces/auth.types';
import { adminFactory } from './admin.factory';

export function adminPrincipalFactory(overrides: Partial<AdminPrincipal> = {}): AdminPrincipal {
  const admin = adminFactory();
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    ...overrides,
  };
}

export function authSessionFactory(overrides: Partial<AuthSession> = {}): AuthSession {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: '4de90daa-74a2-40e1-9ad6-0d88aec7628a',
    adminId: adminFactory().id,
    tokenHash: 'a'.repeat(64),
    tokenFamilyId: '3150e95c-43f0-473b-836b-86e969c5065c',
    userAgent: 'NAC test client',
    ipHash: 'b'.repeat(64),
    expiresAt: new Date('2026-01-08T00:00:00.000Z'),
    lastUsedAt: null,
    revokedAt: null,
    createdAt: now,
    ...overrides,
  };
}
