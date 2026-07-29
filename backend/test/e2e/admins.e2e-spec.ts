import * as request from 'supertest';
import { authenticatedSession, TestSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

describe('Administrator management (e2e)', () => {
  let context: E2eTestContext;
  let superAdmin: TestSession;
  let editor: TestSession;

  beforeAll(async () => {
    context = await createE2eTestContext();
    superAdmin = await authenticatedSession(context.app, context.actors.superAdmin.email, E2E_PASSWORD);
    editor = await authenticatedSession(context.app, context.actors.editor.email, E2E_PASSWORD);
  });
  afterAll(async () => closeE2eTestContext(context));

  it('enforces authentication and the SUPER_ADMIN role', async () => {
    await request(context.app.getHttpServer()).get('/api/v1/admin/users').expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', editor.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', superAdmin.authorization)
      .expect(200);
  });

  it('creates, reads, updates, lists, and deletes an administrator', async () => {
    const created = await request(context.app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('Authorization', superAdmin.authorization)
      .send({
        name: 'Managed Editor',
        email: 'managed-editor@e2e.test',
        password: 'ManagedPassword123',
        role: 'CONTENT_EDITOR',
      })
      .expect(201);
    const id = created.body.data.id as string;
    expect(created.body.data).not.toHaveProperty('passwordHash');

    await request(context.app.getHttpServer())
      .get(`/api/v1/admin/users/${id}`)
      .set('Authorization', superAdmin.authorization)
      .expect(200);
    await request(context.app.getHttpServer())
      .patch(`/api/v1/admin/users/${id}`)
      .set('Authorization', superAdmin.authorization)
      .send({ name: 'Updated Managed Editor', role: 'FINANCE_VIEWER' })
      .expect(200)
      .expect(({ body }) => expect(body.data.role).toBe('FINANCE_VIEWER'));
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/users/${id}`)
      .set('Authorization', superAdmin.authorization)
      .expect(200);
    await request(context.app.getHttpServer())
      .get(`/api/v1/admin/users/${id}`)
      .set('Authorization', superAdmin.authorization)
      .expect(404);
  });
});
