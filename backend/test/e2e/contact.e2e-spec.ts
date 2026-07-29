import * as request from 'supertest';
import { authenticatedSession, TestSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

describe('Contact submissions (e2e)', () => {
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

  it('accepts a public message while protecting private submission data', async () => {
    await request(context.app.getHttpServer()).get('/api/v1/public/contact?languageCode=en').expect(200);
    const submitted = await request(context.app.getHttpServer())
      .post('/api/v1/public/contact')
      .send({
        name: 'E2E Parent',
        email: 'parent@e2e.test',
        subject: 'Program information',
        message: 'Please share more information about your programs.',
        languageCode: 'en',
      })
      .expect(201);
    expect(submitted.body.data).not.toHaveProperty('email');

    await request(context.app.getHttpServer()).get('/api/v1/admin/contact').expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/contact')
      .set('Authorization', finance.authorization)
      .expect(403);
    const listed = await request(context.app.getHttpServer())
      .get('/api/v1/admin/contact')
      .set('Authorization', editor.authorization)
      .expect(200);
    expect(listed.body.data.data[0].email).toBe('parent@e2e.test');
    const id = listed.body.data.data[0].id as string;
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/contact/${id}`)
      .set('Authorization', editor.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/contact/${id}`)
      .set('Authorization', superAdmin.authorization)
      .expect(200);
  });
});
