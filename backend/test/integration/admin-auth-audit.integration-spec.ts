import { eq } from 'drizzle-orm';
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

const describeWithPostgres = process.env.TEST_DATABASE_URL ? describe : describe.skip;

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
});
