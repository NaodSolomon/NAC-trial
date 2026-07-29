import * as request from 'supertest';
import { authenticatedSession, TestSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

describe('Navigation and settings (e2e)', () => {
  let context: E2eTestContext;
  let superAdmin: TestSession;
  let editor: TestSession;
  let finance: TestSession;

  beforeAll(async () => {
    context = await createE2eTestContext();
    superAdmin = await authenticatedSession(context.app, context.actors.superAdmin.email, E2E_PASSWORD);
    editor = await authenticatedSession(context.app, context.actors.editor.email, E2E_PASSWORD);
    finance = await authenticatedSession(context.app, context.actors.finance.email, E2E_PASSWORD);
  });
  afterAll(async () => closeE2eTestContext(context));

  it('creates, publishes, updates, and deletes navigation without exposing hidden items', async () => {
    await request(context.app.getHttpServer()).get('/api/v1/admin/navigation').expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/navigation')
      .set('Authorization', finance.authorization)
      .expect(403);
    const created = await request(context.app.getHttpServer())
      .post('/api/v1/admin/navigation')
      .set('Authorization', editor.authorization)
      .send({ label: 'Programs', url: '/programs', order: 1, languageCode: 'en' })
      .expect(201);
    const id = created.body.data.id as string;
    await request(context.app.getHttpServer())
      .get('/api/v1/navigation?languageCode=en')
      .expect(200)
      .expect(({ body }) => expect(body.data).toHaveLength(1));
    await request(context.app.getHttpServer())
      .patch(`/api/v1/admin/navigation/${id}`)
      .set('Authorization', editor.authorization)
      .send({ isVisible: false })
      .expect(200);
    await request(context.app.getHttpServer())
      .get('/api/v1/navigation?languageCode=en')
      .expect(200)
      .expect(({ body }) => expect(body.data).toHaveLength(0));
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/navigation/${id}`)
      .set('Authorization', editor.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/navigation/${id}`)
      .set('Authorization', superAdmin.authorization)
      .expect(200);
  });

  it('limits settings writes to SUPER_ADMIN and exposes only public fields', async () => {
    await request(context.app.getHttpServer()).get('/api/v1/admin/settings').expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/settings')
      .set('Authorization', editor.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .patch('/api/v1/admin/settings')
      .set('Authorization', superAdmin.authorization)
      .send({
        siteName: 'Nehemiah Autism Center E2E',
        contactEmail: 'hello@nehemiah.test',
        supportedLanguages: ['en', 'am'],
      })
      .expect(200);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/settings')
      .set('Authorization', superAdmin.authorization)
      .expect(200);
    await request(context.app.getHttpServer())
      .get('/api/v1/settings')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.siteName).toBe('Nehemiah Autism Center E2E');
        expect(body.data).not.toHaveProperty('updatedBy');
      });
  });
});
