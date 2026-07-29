import * as request from 'supertest';
import { authenticatedSession, TestSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

describe('CMS pages and publishing (e2e)', () => {
  let context: E2eTestContext;
  let editor: TestSession;
  let finance: TestSession;

  beforeAll(async () => {
    context = await createE2eTestContext();
    editor = await authenticatedSession(context.app, context.actors.editor.email, E2E_PASSWORD);
    finance = await authenticatedSession(context.app, context.actors.finance.email, E2E_PASSWORD);
  });
  afterAll(async () => closeE2eTestContext(context));

  it('protects CMS routes by authentication and role', async () => {
    await request(context.app.getHttpServer()).get('/api/v1/admin/cms/pages').expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/cms/pages')
      .set('Authorization', finance.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/cms/pages')
      .set('Authorization', editor.authorization)
      .expect(200);
  });

  it('keeps drafts private and supports the complete publishing workflow', async () => {
    const draft = await request(context.app.getHttpServer())
      .post('/api/v1/admin/cms/pages')
      .set('Authorization', editor.authorization)
      .send({
        slug: 'e2e-private-page',
        languageCode: 'en',
        title: 'Private draft',
        content: 'Draft content',
      })
      .expect(201);
    const id = draft.body.data.id as string;

    await request(context.app.getHttpServer()).get('/api/v1/public/pages/e2e-private-page').expect(404);
    await request(context.app.getHttpServer())
      .get(`/api/v1/admin/cms/pages/${id}`)
      .set('Authorization', editor.authorization)
      .expect(200);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/slugs/check?slug=e2e-private-page&languageCode=en')
      .set('Authorization', editor.authorization)
      .expect(200)
      .expect(({ body }) => expect(body.data.available).toBe(false));
    await request(context.app.getHttpServer())
      .patch(`/api/v1/admin/cms/pages/${id}`)
      .set('Authorization', editor.authorization)
      .send({ title: 'Published page' })
      .expect(200);
    await request(context.app.getHttpServer())
      .post(`/api/v1/admin/cms/pages/${id}/publish`)
      .set('Authorization', editor.authorization)
      .expect(201);
    await request(context.app.getHttpServer())
      .get('/api/v1/public/pages/e2e-private-page')
      .expect(200)
      .expect(({ body }) => expect(body.data.title).toBe('Published page'));
  });

  it('schedules and deletes drafts and authorizes the internal publishing job', async () => {
    const draft = await request(context.app.getHttpServer())
      .post('/api/v1/admin/cms/pages')
      .set('Authorization', editor.authorization)
      .send({
        slug: 'e2e-scheduled-page',
        languageCode: 'en',
        title: 'Scheduled page',
        content: 'Scheduled content',
      })
      .expect(201);
    const id = draft.body.data.id as string;
    await request(context.app.getHttpServer())
      .post(`/api/v1/admin/cms/pages/${id}/schedule`)
      .set('Authorization', editor.authorization)
      .send({ scheduledAt: new Date(Date.now() + 3_600_000).toISOString() })
      .expect(201);
    await request(context.app.getHttpServer())
      .post('/api/v1/internal/jobs/publish-scheduled')
      .set('x-internal-api-key', 'development-internal-api-key-change-me')
      .expect(201);
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/cms/pages/${id}`)
      .set('Authorization', editor.authorization)
      .expect(200);
  });
});
