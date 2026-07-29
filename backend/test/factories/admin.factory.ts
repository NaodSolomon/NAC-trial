import { Admin } from '../../src/database/schema';

export function adminFactory(overrides: Partial<Admin> = {}): Admin {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'b96c693c-45d7-4937-952c-a957eedfdb08',
    name: 'Test Administrator',
    email: 'admin@example.com',
    passwordHash: '$2b$10$test-only-hash',
    role: 'SUPER_ADMIN',
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
