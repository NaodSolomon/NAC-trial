import { describe, expect, it } from 'vitest';
import { safeAuditMetadata } from './safe-audit-metadata';
import { administratorSchema, adminSessionSchema, readinessSchema } from './system.schemas';

const now = '2026-08-12T09:00:00.000Z';

describe('system administration contracts', () => {
  it('discards administrator and session secret fields from API responses', () => {
    const administrator = administratorSchema.parse({
      id: '00000000-0000-4000-8000-000000004501',
      name: 'Administrator',
      email: 'admin@example.org',
      role: 'SUPER_ADMIN',
      isActive: true,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
      passwordHash: 'must-not-survive',
      failedLoginAttempts: 3,
      lockedUntil: now,
    });
    const session = adminSessionSchema.parse({
      id: '00000000-0000-4000-8000-000000004502',
      admin: {
        id: administrator.id,
        name: administrator.name,
        email: administrator.email,
      },
      userAgent: 'Browser',
      ipFingerprint: 'abc123',
      createdAt: now,
      lastUsedAt: now,
      expiresAt: now,
      status: 'ACTIVE',
      refreshTokenHash: 'must-not-survive',
      rawIpAddress: '127.0.0.1',
      tokenFamilyId: 'must-not-survive',
    });

    expect(administrator).not.toHaveProperty('passwordHash');
    expect(administrator).not.toHaveProperty('failedLoginAttempts');
    expect(session).not.toHaveProperty('refreshTokenHash');
    expect(session).not.toHaveProperty('rawIpAddress');
    expect(session).not.toHaveProperty('tokenFamilyId');
  });

  it('reports PostgreSQL readiness and Redis degradation independently', () => {
    const degraded = readinessSchema.parse({
      status: 'degraded',
      checks: { postgresql: 'connected', redis: 'unavailable' },
      database: 'connected',
      redis: 'unavailable',
      mode: 'trial',
      timestamp: now,
    });
    expect(degraded.checks.postgresql).toBe('connected');
    expect(degraded.checks.redis).toBe('unavailable');
  });

  it('allows only bounded display-safe audit metadata', () => {
    expect(
      safeAuditMetadata({
        scope: 'public-cache',
        durationMs: 120,
        password: 'secret',
        refreshToken: 'token',
        donorEmail: 'private@example.org',
        nested: { unsafe: true },
      }),
    ).toEqual([
      { label: 'Scope', value: 'public-cache' },
      { label: 'Duration Ms', value: '120' },
    ]);
  });
});
