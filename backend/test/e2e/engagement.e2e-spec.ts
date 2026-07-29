import * as request from 'supertest';
import { authenticatedSession, TestSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

describe('Volunteers, testimonials, and newsletter (e2e)', () => {
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

  it('accepts and privately manages volunteer applications', async () => {
    await request(context.app.getHttpServer()).get('/api/v1/public/volunteer').expect(200);
    await request(context.app.getHttpServer())
      .post('/api/v1/public/volunteer/apply')
      .send({
        name: 'E2E Volunteer',
        email: 'volunteer@e2e.test',
        phone: '+251 911 000 000',
        roleInterest: 'Event support',
        message: 'I would like to volunteer and help families during center events.',
        languageCode: 'en',
      })
      .expect(201);
    await request(context.app.getHttpServer()).get('/api/v1/admin/volunteers').expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/volunteers')
      .set('Authorization', finance.authorization)
      .expect(403);
    const listed = await request(context.app.getHttpServer())
      .get('/api/v1/admin/volunteers')
      .set('Authorization', editor.authorization)
      .expect(200);
    const id = listed.body.data.data[0].id as string;
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/volunteers/${id}`)
      .set('Authorization', editor.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/volunteers/${id}`)
      .set('Authorization', superAdmin.authorization)
      .expect(200);
  });

  it('never exposes draft testimonials publicly and covers their lifecycle', async () => {
    const created = await request(context.app.getHttpServer())
      .post('/api/v1/admin/testimonials')
      .set('Authorization', editor.authorization)
      .send({
        name: 'E2E Family',
        text: 'The center has made a meaningful difference for our family.',
        languageCode: 'en',
        status: 'DRAFT',
      })
      .expect(201);
    const id = created.body.data.id as string;
    await request(context.app.getHttpServer())
      .get('/api/v1/public/testimonials')
      .expect(200)
      .expect(({ body }) => expect(body.data.data).toHaveLength(0));
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/testimonials')
      .set('Authorization', editor.authorization)
      .expect(200);
    await request(context.app.getHttpServer())
      .patch(`/api/v1/admin/testimonials/${id}`)
      .set('Authorization', editor.authorization)
      .send({ status: 'PUBLISHED' })
      .expect(200);
    await request(context.app.getHttpServer())
      .get('/api/v1/public/testimonials')
      .expect(200)
      .expect(({ body }) => expect(body.data.data).toHaveLength(1));
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/testimonials/${id}`)
      .set('Authorization', editor.authorization)
      .expect(200);
  });

  it('subscribes publicly but restricts subscriber identities to SUPER_ADMIN', async () => {
    await request(context.app.getHttpServer())
      .post('/api/v1/public/newsletter')
      .send({ email: 'subscriber@e2e.test', languageCode: 'en' })
      .expect(201);
    await request(context.app.getHttpServer()).get('/api/v1/admin/newsletter').expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/newsletter')
      .set('Authorization', editor.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/newsletter')
      .set('Authorization', superAdmin.authorization)
      .expect(200);
    await request(context.app.getHttpServer())
      .delete('/api/v1/admin/newsletter/subscriber%40e2e.test')
      .set('Authorization', superAdmin.authorization)
      .expect(200);
  });
});
