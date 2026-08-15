import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { admins, auditLogs, authSessions } from '../../src/database/schema';
import { DrizzleAdminManagementRepository } from '../../src/modules/admins/repositories/drizzle-admin-management.repository';
import { DrizzleAdminRepository } from '../../src/modules/admins/repositories/drizzle-admin.repository';
import { DrizzleAuditLogRepository } from '../../src/modules/audit/repositories/drizzle-audit-log.repository';
import { DrizzleAuthSessionRepository } from '../../src/modules/auth/repositories/drizzle-auth-session.repository';
import { authSessionFactory } from '../factories/auth.factory';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import {
  connectTestPostgres,
  expectPostgresError,
  PostgresTestContext,
} from '../helpers/postgres-test.helper';
import { ACTOR_ID, insertTestAdmin, pageCriteria } from '../helpers/repository-fixtures.helper';
import { describeWithPostgres } from '../helpers/database-availability.helper';

describeWithPostgres('Administrator, authentication, and audit repositories (PostgreSQL)', () => {
  let context: PostgresTestContext;
  let adminsRepository: DrizzleAdminRepository;
  let managementRepository: DrizzleAdminManagementRepository;
  let sessionsRepository: DrizzleAuthSessionRepository;
  let auditRepository: DrizzleAuditLogRepository;

  beforeAll(async () => {
    context = await connectTestPostgres();
    adminsRepository = new DrizzleAdminRepository(context.db);
    managementRepository = new DrizzleAdminManagementRepository(context.db);
    sessionsRepository = new DrizzleAuthSessionRepository(context.db);
    auditRepository = new DrizzleAuditLogRepository(context.db);
  });

  beforeEach(async () => {
    await cleanTestDatabase(context);
    await insertTestAdmin(context);
  });

  afterAll(async () => {
    await context?.pool.end();
  });

  it('finds administrators case-insensitively and persists lockout state', async () => {
    await expect(adminsRepository.findByEmail('ADMIN@INTEGRATION.TEST')).resolves.toMatchObject({
      id: ACTOR_ID,
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await adminsRepository.recordFailedLogin(ACTOR_ID);
    }
    const locked = await adminsRepository.findById(ACTOR_ID);
    expect(locked).toMatchObject({ failedLoginAttempts: 5 });
    expect(locked?.lockedUntil).toBeInstanceOf(Date);

    await adminsRepository.recordSuccessfulLogin(ACTOR_ID);
    await expect(adminsRepository.findById(ACTOR_ID)).resolves.toMatchObject({
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    await expect(auditRepository.list({ ...pageCriteria, action: 'login' })).resolves.toMatchObject(
      {
        data: [expect.objectContaining({ adminId: ACTOR_ID, action: 'LOGIN' })],
      },
    );
  });

  it('creates an administrator and audit record atomically', async () => {
    const created = await managementRepository.create(
      {
        name: 'Content Editor',
        email: 'editor@integration.test',
        passwordHash: '$2b$10$integration-editor-hash',
        role: 'CONTENT_EDITOR',
      },
      ACTOR_ID,
    );

    await expect(
      managementRepository.list({ ...pageCriteria, role: 'CONTENT_EDITOR' }),
    ).resolves.toMatchObject({
      data: [expect.objectContaining({ id: created.id })],
      meta: { total: 1 },
    });
    await expect(
      auditRepository.list({ ...pageCriteria, entityType: 'admin', action: 'create' }),
    ).resolves.toMatchObject({
      data: [expect.objectContaining({ entityId: created.id })],
    });
  });

  it('rolls back administrator creation when its audit write fails', async () => {
    await expectPostgresError(
      managementRepository.create(
        {
          name: 'Rolled Back Editor',
          email: 'rollback@integration.test',
          passwordHash: '$2b$10$rollback-hash',
          role: 'CONTENT_EDITOR',
        },
        '00000000-0000-4000-8000-000000000099',
      ),
      '23503',
    );

    const persisted = await context.db
      .select()
      .from(admins)
      .where(eq(admins.email, 'rollback@integration.test'));
    expect(persisted).toHaveLength(0);
  });

  it('enforces case-insensitive administrator email uniqueness', async () => {
    await expectPostgresError(
      context.db.insert(admins).values({
        name: 'Duplicate',
        email: 'ADMIN@INTEGRATION.TEST',
        passwordHash: '$2b$10$duplicate-hash',
        role: 'CONTENT_EDITOR',
      }),
      '23505',
    );
  });

  it('rotates sessions and revokes every active token in a reused family', async () => {
    const familyId = '3150e95c-43f0-473b-836b-86e969c5065c';
    const first = await sessionsRepository.create(
      authSessionFactory({
        adminId: ACTOR_ID,
        tokenFamilyId: familyId,
        tokenHash: 'a'.repeat(64),
      }),
    );
    const replacement = await sessionsRepository.rotate(
      first.id,
      authSessionFactory({
        id: '1c580900-cb9d-4357-b090-a2b06f95e7ee',
        adminId: ACTOR_ID,
        tokenFamilyId: familyId,
        tokenHash: 'b'.repeat(64),
      }),
    );

    expect(replacement).toBeTruthy();
    expect((await sessionsRepository.findById(first.id))?.revokedAt).toBeInstanceOf(Date);
    await sessionsRepository.revokeFamily(familyId);
    const family = await context.db
      .select()
      .from(authSessions)
      .where(eq(authSessions.tokenFamilyId, familyId));
    expect(family).toHaveLength(2);
    expect(family.every((session) => session.revokedAt instanceof Date)).toBe(true);
  });

  it('writes logout audit metadata without storing the raw token', async () => {
    const session = await sessionsRepository.create(
      authSessionFactory({ adminId: ACTOR_ID, tokenHash: 'c'.repeat(64) }),
    );
    await sessionsRepository.revokeByTokenHash(session.tokenHash);

    const [logout] = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'LOGOUT'));
    expect(logout).toMatchObject({
      adminId: ACTOR_ID,
      entityId: session.id,
      metadata: {},
    });
    expect(JSON.stringify(logout)).not.toContain(session.tokenHash);
  });

  it('lists safe session projections with pagination and status filters', async () => {
    const active = await sessionsRepository.create(
      authSessionFactory({
        adminId: ACTOR_ID,
        tokenHash: 'd'.repeat(64),
        ipHash: '1234567890abcdef'.repeat(4),
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(Date.now() - 1_000),
      }),
    );
    await sessionsRepository.create(
      authSessionFactory({
        id: 'a6d92fb8-669c-41c0-93ac-d534dc0f1561',
        adminId: ACTOR_ID,
        tokenHash: 'e'.repeat(64),
        expiresAt: new Date(Date.now() - 86_400_000),
      }),
    );

    const listed = await sessionsRepository.list({
      page: 1,
      limit: 1,
      offset: 0,
      adminId: ACTOR_ID,
      status: 'active',
    });

    expect(listed).toMatchObject({
      data: [
        {
          id: active.id,
          admin: { id: ACTOR_ID, email: 'admin@integration.test' },
          ipFingerprint: '1234567890ab',
          status: 'ACTIVE',
        },
      ],
      meta: { total: 1, page: 1, limit: 1, totalPages: 1 },
    });
    expect(JSON.stringify(listed)).not.toContain(active.tokenHash);
    expect(JSON.stringify(listed)).not.toContain(active.tokenFamilyId);
    expect(JSON.stringify(listed)).not.toContain(active.ipHash!);

    await expect(
      sessionsRepository.list({ page: 1, limit: 20, offset: 0, status: 'expired' }),
    ).resolves.toMatchObject({ meta: { total: 1 } });
    await expect(
      sessionsRepository.list({ page: 1, limit: 20, offset: 0, status: 'all' }),
    ).resolves.toMatchObject({ meta: { total: 2 } });

    await sessionsRepository.revokeSession(active.id, ACTOR_ID);
    await expect(
      sessionsRepository.list({ page: 1, limit: 20, offset: 0, status: 'revoked' }),
    ).resolves.toMatchObject({
      data: [expect.objectContaining({ id: active.id, status: 'REVOKED' })],
      meta: { total: 1 },
    });
  });

  it('revokes one session and inserts its audit record atomically', async () => {
    const session = await sessionsRepository.create(
      authSessionFactory({
        adminId: ACTOR_ID,
        tokenHash: 'f'.repeat(64),
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
    );

    await expect(sessionsRepository.revokeSession(session.id, ACTOR_ID)).resolves.toBe('revoked');
    await expect(sessionsRepository.revokeSession(session.id, ACTOR_ID)).resolves.toBe(
      'already_revoked',
    );
    await expect(sessionsRepository.revokeSession(randomUUID(), ACTOR_ID)).resolves.toBe(
      'not_found',
    );

    const [audit] = await context.db.select().from(auditLogs).where(eq(auditLogs.action, 'REVOKE'));
    expect(audit).toMatchObject({
      adminId: ACTOR_ID,
      entityType: 'AUTH_SESSION',
      entityId: session.id,
    });
  });

  it('rolls back a session revocation when the audit insert fails', async () => {
    const session = await sessionsRepository.create(
      authSessionFactory({
        adminId: ACTOR_ID,
        tokenHash: '1'.repeat(64),
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
    );

    await expectPostgresError(
      sessionsRepository.revokeSession(session.id, '00000000-0000-4000-8000-000000000099'),
      '23503',
    );
    await expect(sessionsRepository.findById(session.id)).resolves.toMatchObject({
      revokedAt: null,
    });
    const audits = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, session.id));
    expect(audits).toHaveLength(0);
  });

  it('revokes every non-revoked session for an administrator with one audit event', async () => {
    await sessionsRepository.create(
      authSessionFactory({
        adminId: ACTOR_ID,
        tokenHash: '2'.repeat(64),
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
    );
    await sessionsRepository.create(
      authSessionFactory({
        id: '739d2297-1ea3-4a0d-9e56-54acddb3b490',
        adminId: ACTOR_ID,
        tokenHash: '3'.repeat(64),
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
    );

    await expect(sessionsRepository.revokeAllForAdmin(ACTOR_ID, ACTOR_ID)).resolves.toBe(2);
    await expect(sessionsRepository.revokeAllForAdmin(ACTOR_ID, ACTOR_ID)).resolves.toBe(0);

    const sessions = await context.db
      .select()
      .from(authSessions)
      .where(eq(authSessions.adminId, ACTOR_ID));
    expect(sessions.every((session) => session.revokedAt instanceof Date)).toBe(true);
    const audits = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'REVOKE_ALL'));
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ entityType: 'AUTH_SESSION', entityId: ACTOR_ID });
  });
});
