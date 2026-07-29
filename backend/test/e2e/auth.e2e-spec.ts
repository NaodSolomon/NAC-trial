import * as request from 'supertest';
import { authenticatedSession, bearerAuthorization, loginForTest } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

describe('Authentication (e2e)', () => {
  let context: E2eTestContext;

  beforeAll(async () => {
    context = await createE2eTestContext();
  });
  afterAll(async () => closeE2eTestContext(context));

  it('logs in, authorizes an access token, rotates refresh tokens, and logs out', async () => {
    const first = await loginForTest(context.app, {
      email: context.actors.superAdmin.email,
      password: E2E_PASSWORD,
    });
    await request(context.app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', bearerAuthorization(first.accessToken))
      .expect(200)
      .expect(({ body }) => expect(body.data.role).toBe('SUPER_ADMIN'));

    const refreshed = await request(context.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(200);
    expect(refreshed.body.data.refreshToken).not.toBe(first.refreshToken);

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', bearerAuthorization(refreshed.body.data.accessToken))
      .expect(401);
  });

  it('revokes the active session on logout', async () => {
    const session = await authenticatedSession(
      context.app,
      context.actors.editor.email,
      E2E_PASSWORD,
    );
    await request(context.app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', session.authorization)
      .send({ refreshToken: session.refreshToken })
      .expect(200);
    await request(context.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', session.authorization)
      .expect(401);
  });

  it('rejects protected access without a token and invalid credentials', async () => {
    await request(context.app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    await request(context.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: context.actors.finance.email, password: 'WrongPassword123' })
      .expect(401);
  });
});
