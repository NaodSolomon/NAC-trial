import { eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import * as request from 'supertest';
import { admins, auditLogs, passwordResetTokens } from '../../src/database/schema';
import { authenticatedSession, bearerAuthorization } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

const genericResponse = {
  message: 'If the account exists, password reset instructions have been sent.',
};
const newPassword = 'ReplacementPassword123';

describe('Password reset (e2e)', () => {
  let context: E2eTestContext;

  beforeAll(async () => {
    context = await createE2eTestContext();
  });

  afterAll(async () => closeE2eTestContext(context));

  it('returns the identical public response without exposing account membership', async () => {
    const existing = await request(context.app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({ email: context.actors.editor.email })
      .expect(200);
    const missing = await request(context.app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'missing-administrator@e2e.test' })
      .expect(200);

    expect(existing.body.data).toEqual(genericResponse);
    expect(missing.body.data).toEqual(genericResponse);
    expect(existing.body.data).toEqual(missing.body.data);
    expect(context.mailer.send).toHaveBeenCalledTimes(1);
  });

  it('completes a single-use reset, clears lockout, and invalidates every old session', async () => {
    const firstSession = await authenticatedSession(
      context.app,
      context.actors.editor.email,
      E2E_PASSWORD,
    );
    const secondSession = await authenticatedSession(
      context.app,
      context.actors.editor.email,
      E2E_PASSWORD,
    );
    await context.db
      .update(admins)
      .set({ failedLoginAttempts: 5, lockedUntil: new Date(Date.now() + 15 * 60_000) })
      .where(eq(admins.id, context.actors.editor.id));

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({ email: context.actors.editor.email })
      .expect(200);

    const message = context.mailer.send.mock.calls[0][0];
    const urlLine = message.text
      .split('\n')
      .find((line) => line.startsWith('Reset your password: '));
    expect(urlLine).toBeDefined();
    const resetUrl = new URL(urlLine!.replace('Reset your password: ', ''));
    const rawToken = resetUrl.searchParams.get('token');
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(message.text.split(rawToken!).length - 1).toBe(1);

    const [storedToken] = await context.db.select().from(passwordResetTokens);
    expect(storedToken.tokenHash).toBe(createHash('sha256').update(rawToken!).digest('hex'));
    expect(JSON.stringify(storedToken)).not.toContain(rawToken!);

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: rawToken, newPassword: 'weak-password' })
      .expect(400);
    await request(context.app.getHttpServer())
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: rawToken, newPassword })
      .expect(200)
      .expect(({ body }) =>
        expect(body.data).toEqual({ message: 'Password has been reset successfully.' }),
      );

    const [resetAdmin] = await context.db
      .select()
      .from(admins)
      .where(eq(admins.id, context.actors.editor.id));
    expect(resetAdmin).toMatchObject({ failedLoginAttempts: 0, lockedUntil: null });

    for (const session of [firstSession, secondSession]) {
      await request(context.app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', bearerAuthorization(session.accessToken))
        .expect(401);
    }
    await request(context.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: context.actors.editor.email, password: E2E_PASSWORD })
      .expect(401);
    await request(context.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: context.actors.editor.email, password: newPassword })
      .expect(200);

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: rawToken, newPassword: 'AnotherPassword123' })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe('Password reset token is invalid or expired'),
      );

    const [audit] = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'PASSWORD_RESET'));
    expect(audit).toMatchObject({
      adminId: context.actors.editor.id,
      entityType: 'ADMIN',
      entityId: context.actors.editor.id,
      metadata: { revokedSessionCount: 2 },
    });
    const serializedAudit = JSON.stringify(audit);
    expect(serializedAudit).not.toContain(rawToken!);
    expect(serializedAudit).not.toContain(newPassword);
  });

  it('limits reset requests to three attempts per fifteen minutes per IP', async () => {
    await request(context.app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'another-missing-account@e2e.test' })
      .expect(429);
  });
});
