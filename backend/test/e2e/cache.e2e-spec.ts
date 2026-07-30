import * as request from 'supertest';
import { authenticatedSession, TestSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

describe('Cache administration and health (e2e)', () => {
  let context: E2eTestContext;
  let superAdmin: TestSession;
  let editor: TestSession;

  beforeAll(async () => {
    context = await createE2eTestContext();
    superAdmin = await authenticatedSession(
      context.app,
      context.actors.superAdmin.email,
      E2E_PASSWORD,
    );
    editor = await authenticatedSession(context.app, context.actors.editor.email, E2E_PASSWORD);
  });
  afterAll(async () => closeE2eTestContext(context));

  it('reports PostgreSQL and Redis independently', async () => {
    await request(context.app.getHttpServer())
      .get('/api/v1/system/health')
      .expect(200)
      .expect(({ body }) =>
        expect(body.data).toMatchObject({
          status: 'ok',
          checks: { postgresql: 'connected', redis: 'connected' },
        }),
      );
  });

  it('restricts cache clearing to super administrators', async () => {
    await request(context.app.getHttpServer()).post('/api/v1/admin/cache/clear').expect(401);
    await request(context.app.getHttpServer())
      .post('/api/v1/admin/cache/clear')
      .set('Authorization', editor.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .post('/api/v1/admin/cache/clear')
      .set('Authorization', superAdmin.authorization)
      .expect(201)
      .expect(({ body }) => expect(body.data).toEqual({ cleared: true }));
    expect(context.cache.clear).toHaveBeenCalledTimes(1);

    await request(context.app.getHttpServer())
      .post('/api/v1/admin/cache/warm')
      .set('Authorization', superAdmin.authorization)
      .expect(201)
      .expect(({ body }) =>
        expect(body.data.warmed).toEqual([
          'settings:public',
          'navigation:en',
          'navigation:am',
        ]),
      );
  });

  it('uses cache-aside for public content and invalidates after a CMS mutation', async () => {
    await request(context.app.getHttpServer())
      .get('/api/v1/public/pages/contact?languageCode=en')
      .expect(200);
    expect(context.cache.remember).toHaveBeenCalledWith(
      'cms',
      'en:contact',
      300,
      expect.any(Function),
    );

    const pages = await request(context.app.getHttpServer())
      .get('/api/v1/admin/cms/pages')
      .set('Authorization', superAdmin.authorization)
      .expect(200);
    const page = pages.body.data.data.find((item: { slug: string }) => item.slug === 'contact');
    await request(context.app.getHttpServer())
      .patch(`/api/v1/admin/cms/pages/${page.id}`)
      .set('Authorization', superAdmin.authorization)
      .send({ title: 'Updated contact' })
      .expect(200);
    expect(context.cache.invalidate).toHaveBeenCalledWith('cms');
  });
});
