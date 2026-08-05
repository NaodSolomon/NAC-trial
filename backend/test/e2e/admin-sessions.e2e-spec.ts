import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import * as request from 'supertest';
import { auditLogs } from '../../src/database/schema';
import { bearerAuthorization } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

interface LoginTokens {
  accessToken: string;
  refreshToken: string;
}

describe('Administrator session dashboard (e2e)', () => {
  let context: E2eTestContext;
  let superSession: LoginTokens;
  let editorSession: LoginTokens;

  beforeAll(async () => {
    context = await createE2eTestContext();
    superSession = await login(context, context.actors.superAdmin.email, 'Step23-Super');
    editorSession = await login(context, context.actors.editor.email, 'Step23-Editor');
  });

  afterAll(async () => closeE2eTestContext(context));

  it('enforces authentication and the super-administrator role', async () => {
    await request(context.app.getHttpServer()).get('/api/v1/admin/system/sessions').expect(401);
    await request(context.app.getHttpServer())
      .post('/api/v1/admin/system/sessions/revoke')
      .send({ sessionId: randomUUID() })
      .expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/system/sessions')
      .set('Authorization', bearerAuthorization(editorSession.accessToken))
      .expect(403);
    await request(context.app.getHttpServer())
      .post('/api/v1/admin/system/sessions/revoke')
      .set('Authorization', bearerAuthorization(editorSession.accessToken))
      .send({ sessionId: randomUUID() })
      .expect(403);
  });

  it('lists only safe fields and supports pagination and status filters', async () => {
    const response = await request(context.app.getHttpServer())
      .get('/api/v1/admin/system/sessions')
      .query({ page: 1, limit: 1, adminId: context.actors.editor.id, status: 'active' })
      .set('Authorization', bearerAuthorization(superSession.accessToken))
      .expect(200);

    expect(response.body.data.meta).toMatchObject({ page: 1, limit: 1, total: 1, totalPages: 1 });
    expect(response.body.data.data[0]).toMatchObject({
      admin: {
        id: context.actors.editor.id,
        email: context.actors.editor.email,
      },
      userAgent: 'Step23-Editor',
      status: 'ACTIVE',
    });
    expect(response.body.data.data[0].ipFingerprint).toHaveLength(12);

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('tokenHash');
    expect(serialized).not.toContain('tokenFamilyId');
    expect(serialized).not.toContain('refreshToken');
    expect(serialized).not.toContain('ipHash');
    expect(response.body.data.data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        createdAt: expect.any(String),
        lastUsedAt: expect.any(String),
        expiresAt: expect.any(String),
      }),
    );

    await request(context.app.getHttpServer())
      .get('/api/v1/admin/system/sessions')
      .query({ status: 'unknown' })
      .set('Authorization', bearerAuthorization(superSession.accessToken))
      .expect(400);
  });

  it('revokes one session immediately and records one immutable audit event', async () => {
    const active = await request(context.app.getHttpServer())
      .get('/api/v1/admin/system/sessions')
      .query({ adminId: context.actors.editor.id, status: 'active' })
      .set('Authorization', bearerAuthorization(superSession.accessToken))
      .expect(200);
    const sessionId = active.body.data.data[0].id as string;

    await request(context.app.getHttpServer())
      .post('/api/v1/admin/system/sessions/revoke')
      .set('Authorization', bearerAuthorization(superSession.accessToken))
      .send({ sessionId })
      .expect(200)
      .expect(({ body }) => expect(body.data.revokedCount).toBe(1));

    await request(context.app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', bearerAuthorization(editorSession.accessToken))
      .expect(401);
    await request(context.app.getHttpServer())
      .post('/api/v1/admin/system/sessions/revoke')
      .set('Authorization', bearerAuthorization(superSession.accessToken))
      .send({ sessionId })
      .expect(409);

    const revoked = await request(context.app.getHttpServer())
      .get('/api/v1/admin/system/sessions')
      .query({ adminId: context.actors.editor.id, status: 'revoked' })
      .set('Authorization', bearerAuthorization(superSession.accessToken))
      .expect(200);
    expect(revoked.body.data.data).toEqual([
      expect.objectContaining({ id: sessionId, status: 'REVOKED' }),
    ]);

    const audits = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, sessionId));
    expect(audits).toEqual([
      expect.objectContaining({
        adminId: context.actors.superAdmin.id,
        action: 'REVOKE',
        entityType: 'AUTH_SESSION',
      }),
    ]);
  });

  it('revokes all sessions for an administrator and creates no false audit on failure', async () => {
    const financeFirst = await login(context, context.actors.finance.email, 'Step23-Finance-1');
    const financeSecond = await login(context, context.actors.finance.email, 'Step23-Finance-2');
    const missingSessionId = randomUUID();

    await request(context.app.getHttpServer())
      .post('/api/v1/admin/system/sessions/revoke')
      .set('Authorization', bearerAuthorization(superSession.accessToken))
      .send({ sessionId: missingSessionId })
      .expect(404);
    await request(context.app.getHttpServer())
      .post('/api/v1/admin/system/sessions/revoke')
      .set('Authorization', bearerAuthorization(superSession.accessToken))
      .send({})
      .expect(400);
    await request(context.app.getHttpServer())
      .post('/api/v1/admin/system/sessions/revoke')
      .set('Authorization', bearerAuthorization(superSession.accessToken))
      .send({ sessionId: randomUUID(), adminId: context.actors.finance.id })
      .expect(400);

    await request(context.app.getHttpServer())
      .post('/api/v1/admin/system/sessions/revoke')
      .set('Authorization', bearerAuthorization(superSession.accessToken))
      .send({ adminId: context.actors.finance.id })
      .expect(200)
      .expect(({ body }) => expect(body.data.revokedCount).toBe(2));

    for (const token of [financeFirst.accessToken, financeSecond.accessToken]) {
      await request(context.app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', bearerAuthorization(token))
        .expect(401);
    }

    const falseAudits = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, missingSessionId));
    expect(falseAudits).toHaveLength(0);
    const revokeAllAudits = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'REVOKE_ALL'));
    expect(revokeAllAudits).toEqual([
      expect.objectContaining({
        adminId: context.actors.superAdmin.id,
        entityId: context.actors.finance.id,
        metadata: expect.objectContaining({ revokedCount: 2 }),
      }),
    ]);
  });
});

async function login(
  context: E2eTestContext,
  email: string,
  userAgent: string,
): Promise<LoginTokens> {
  const response = await request(context.app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('User-Agent', userAgent)
    .send({ email, password: E2E_PASSWORD })
    .expect(200);
  return response.body.data as LoginTokens;
}
