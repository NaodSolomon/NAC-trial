import { eq } from 'drizzle-orm';
import { admins, auditLogs, authSessions, passwordResetTokens } from '../../src/database/schema';
import { DrizzlePasswordResetRepository } from '../../src/modules/auth/repositories/drizzle-password-reset.repository';
import { authSessionFactory } from '../factories/auth.factory';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import { connectTestPostgres, PostgresTestContext } from '../helpers/postgres-test.helper';
import { ACTOR_ID, insertTestAdmin } from '../helpers/repository-fixtures.helper';
import { describeWithPostgres } from '../helpers/database-availability.helper';

describeWithPostgres('Password-reset repository (PostgreSQL)', () => {
  let context: PostgresTestContext;
  let repository: DrizzlePasswordResetRepository;

  beforeAll(async () => {
    context = await connectTestPostgres();
    repository = new DrizzlePasswordResetRepository(context.db);
  });

  beforeEach(async () => {
    await cleanTestDatabase(context);
    await insertTestAdmin(context, {
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 15 * 60_000),
    });
  });

  afterAll(async () => {
    await context?.pool.end();
  });

  it('keeps only the newest outstanding token for an administrator', async () => {
    await repository.createResetToken({
      adminId: ACTOR_ID,
      tokenHash: '1'.repeat(64),
      expiresAt: new Date(Date.now() + 20 * 60_000),
    });
    await repository.createResetToken({
      adminId: ACTOR_ID,
      tokenHash: '2'.repeat(64),
      expiresAt: new Date(Date.now() + 20 * 60_000),
    });

    const tokens = await context.db.select().from(passwordResetTokens);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].tokenHash).toBe('2'.repeat(64));

    await repository.invalidateResetToken(tokens[0].tokenHash);
    await expect(context.db.select().from(passwordResetTokens)).resolves.toHaveLength(0);
  });

  it('serializes simultaneous requests so only one token remains effective', async () => {
    await Promise.all([
      repository.createResetToken({
        adminId: ACTOR_ID,
        tokenHash: '8'.repeat(64),
        expiresAt: new Date(Date.now() + 20 * 60_000),
      }),
      repository.createResetToken({
        adminId: ACTOR_ID,
        tokenHash: '9'.repeat(64),
        expiresAt: new Date(Date.now() + 20 * 60_000),
      }),
    ]);

    const tokens = await context.db.select().from(passwordResetTokens);
    expect(tokens).toHaveLength(1);
    expect(['8'.repeat(64), '9'.repeat(64)]).toContain(tokens[0].tokenHash);
  });

  it('rejects expired tokens without changing the administrator', async () => {
    await repository.createResetToken({
      adminId: ACTOR_ID,
      tokenHash: '3'.repeat(64),
      expiresAt: new Date(Date.now() - 1_000),
    });

    await expect(
      repository.consumeResetTokenAndChangePassword('3'.repeat(64), 'replacement-hash'),
    ).resolves.toEqual({ status: 'invalid' });
    await expect(context.db.select().from(admins).where(eq(admins.id, ACTOR_ID))).resolves.toEqual([
      expect.objectContaining({ passwordHash: '$2b$10$integration-test-hash' }),
    ]);
  });

  it('changes the password, clears lockout, revokes sessions, and writes a safe audit atomically', async () => {
    await context.db.insert(authSessions).values([
      authSessionFactory({
        adminId: ACTOR_ID,
        tokenHash: '4'.repeat(64),
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
      authSessionFactory({
        id: 'c3a5dc3a-4152-4b53-a221-8e1ace167c90',
        adminId: ACTOR_ID,
        tokenHash: '5'.repeat(64),
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
    ]);
    await repository.createResetToken({
      adminId: ACTOR_ID,
      tokenHash: '6'.repeat(64),
      expiresAt: new Date(Date.now() + 20 * 60_000),
    });

    await expect(
      repository.consumeResetTokenAndChangePassword('6'.repeat(64), 'replacement-hash'),
    ).resolves.toEqual({
      status: 'consumed',
      adminId: ACTOR_ID,
      revokedSessionCount: 2,
    });

    const [admin] = await context.db.select().from(admins).where(eq(admins.id, ACTOR_ID));
    expect(admin).toMatchObject({
      passwordHash: 'replacement-hash',
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    const sessions = await context.db
      .select()
      .from(authSessions)
      .where(eq(authSessions.adminId, ACTOR_ID));
    expect(sessions.every((session) => session.revokedAt instanceof Date)).toBe(true);
    const [audit] = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'PASSWORD_RESET'));
    expect(audit).toMatchObject({
      adminId: ACTOR_ID,
      entityType: 'ADMIN',
      entityId: ACTOR_ID,
      metadata: { revokedSessionCount: 2 },
    });
    const serializedAudit = JSON.stringify(audit);
    expect(serializedAudit).not.toContain('6'.repeat(64));
    expect(serializedAudit).not.toContain('replacement-hash');

    await expect(
      repository.consumeResetTokenAndChangePassword('6'.repeat(64), 'another-hash'),
    ).resolves.toEqual({ status: 'invalid' });
  });

  it('allows only one of two simultaneous confirmations to claim a token', async () => {
    await repository.createResetToken({
      adminId: ACTOR_ID,
      tokenHash: '7'.repeat(64),
      expiresAt: new Date(Date.now() + 20 * 60_000),
    });

    const results = await Promise.all([
      repository.consumeResetTokenAndChangePassword('7'.repeat(64), 'first-hash'),
      repository.consumeResetTokenAndChangePassword('7'.repeat(64), 'second-hash'),
    ]);

    expect(results.filter((result) => result.status === 'consumed')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'invalid')).toHaveLength(1);
    const audits = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'PASSWORD_RESET'));
    expect(audits).toHaveLength(1);
  });
});
