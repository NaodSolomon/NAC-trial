import * as request from 'supertest';
import { bearerAuthorization } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createMailpitE2eTestContext,
  E2E_PASSWORD,
  MailpitE2eTestContext,
} from '../helpers/e2e-test-context.helper';
import { clearMailpitMailbox, waitForMailpitText } from '../helpers/mailpit-test.helper';
import { SEARCH_TRIGRAM_INDEXES } from '../../src/modules/search/interfaces/search-maintenance-repository.interface';

interface LoginTokens {
  accessToken: string;
  refreshToken: string;
}

const replacementPassword = 'CombinedGatePassword123';

describe('Combined security and regression gate (e2e)', () => {
  let context: MailpitE2eTestContext;

  beforeAll(async () => {
    await clearMailpitMailbox();
    context = await createMailpitE2eTestContext();
  });

  afterAll(async () => closeE2eTestContext(context));

  it('preserves security boundaries across sessions, recovery, SEO, and search maintenance', async () => {
    const firstDevice = await login('Step27-Device-One', E2E_PASSWORD);
    const secondDevice = await login('Step27-Device-Two', E2E_PASSWORD);
    const secondAuthorization = bearerAuthorization(secondDevice.accessToken);

    const sessions = await request(context.app.getHttpServer())
      .get('/api/v1/admin/system/sessions')
      .query({ adminId: context.actors.superAdmin.id, status: 'active', limit: 10 })
      .set('Authorization', secondAuthorization)
      .expect(200);
    expect(sessions.body.data.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userAgent: 'Step27-Device-One', status: 'ACTIVE' }),
        expect.objectContaining({ userAgent: 'Step27-Device-Two', status: 'ACTIVE' }),
      ]),
    );

    const firstSessionId = sessions.body.data.data.find(
      (session: { userAgent: string }) => session.userAgent === 'Step27-Device-One',
    ).id as string;
    await request(context.app.getHttpServer())
      .post('/api/v1/admin/system/sessions/revoke')
      .set('Authorization', secondAuthorization)
      .send({ sessionId: firstSessionId })
      .expect(200);
    await expectSessionRejected(firstDevice);

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({ email: context.actors.superAdmin.email })
      .expect(200);
    const resetEmail = await waitForMailpitText('Reset your password:');
    const resetToken = resetEmail.match(/[?&]token=([a-f0-9]{64})/i)?.[1];
    expect(resetToken).toBeDefined();

    await request(context.app.getHttpServer())
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: resetToken, newPassword: replacementPassword })
      .expect(200);
    await expectSessionRejected(secondDevice);

    const recoveredSession = await login('Step27-Recovered-Device', replacementPassword);
    const recoveredAuthorization = bearerAuthorization(recoveredSession.accessToken);
    const draft = await request(context.app.getHttpServer())
      .post('/api/v1/admin/cms/pages')
      .set('Authorization', recoveredAuthorization)
      .send({
        slug: 'combined-security-proof',
        languageCode: 'en',
        title: 'CombinedGateTerm family support',
        content: 'This page proves the combined security and regression workflow.',
      })
      .expect(201);

    await request(context.app.getHttpServer())
      .patch('/api/v1/admin/seo/combined-security-proof')
      .set('Authorization', recoveredAuthorization)
      .send({
        languageCode: 'en',
        title: 'Combined security verification',
        description: 'Regression-verified Nehemiah Autism Center content.',
        keywords: ['security', 'regression', 'autism'],
      })
      .expect(200);
    await request(context.app.getHttpServer())
      .get('/api/v1/public/seo/combined-security-proof')
      .expect(404);

    await request(context.app.getHttpServer())
      .post(`/api/v1/admin/cms/pages/${draft.body.data.id}/publish`)
      .set('Authorization', recoveredAuthorization)
      .expect(201);
    await request(context.app.getHttpServer())
      .get('/api/v1/public/seo/combined-security-proof')
      .expect(200)
      .expect(({ body }) =>
        expect(body.data).toMatchObject({
          title: 'Combined security verification',
          keywords: ['security', 'regression', 'autism'],
        }),
      );

    await request(context.app.getHttpServer())
      .post('/api/v1/admin/system/search/reindex')
      .set('Authorization', recoveredAuthorization)
      .expect(200)
      .expect(({ body }) => expect(body.data.indexes).toEqual([...SEARCH_TRIGRAM_INDEXES]));
    await request(context.app.getHttpServer())
      .get('/api/v1/public/search')
      .query({ q: 'CombinedGateTerm', languageCode: 'en' })
      .expect(200)
      .expect(({ body }) =>
        expect(body.data.results).toEqual([
          expect.objectContaining({ type: 'page', slug: 'combined-security-proof' }),
        ]),
      );

    const audits = await request(context.app.getHttpServer())
      .get('/api/v1/admin/audit-logs')
      .query({ adminId: context.actors.superAdmin.id, page: 1, limit: 100 })
      .set('Authorization', recoveredAuthorization)
      .expect(200);
    const actions = audits.body.data.data.map((audit: { action: string }) => audit.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'LOGIN',
        'REVOKE',
        'PASSWORD_RESET',
        'CREATE',
        'UPDATE_SEO',
        'PUBLISH',
        'REINDEX',
      ]),
    );
    const serializedAudits = JSON.stringify(audits.body.data.data);
    expect(serializedAudits).not.toContain(resetToken);
    expect(serializedAudits).not.toContain(replacementPassword);
    expect(serializedAudits).not.toContain(firstDevice.refreshToken);
    expect(serializedAudits).not.toContain(secondDevice.refreshToken);
  });

  async function login(userAgent: string, password: string): Promise<LoginTokens> {
    const response = await request(context.app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('User-Agent', userAgent)
      .send({ email: context.actors.superAdmin.email, password })
      .expect(200);
    return response.body.data as LoginTokens;
  }

  async function expectSessionRejected(tokens: LoginTokens): Promise<void> {
    await request(context.app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', bearerAuthorization(tokens.accessToken))
      .expect(401);
    await request(context.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(401);
  }
});
