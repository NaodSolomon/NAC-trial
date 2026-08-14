import * as request from 'supertest';
import { eq } from 'drizzle-orm';
import { storageDeletionOutbox } from '../../src/database/schema';
import { authenticatedSession, TestSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
]);

describe('Media metadata and gallery (e2e)', () => {
  let context: E2eTestContext;
  let superAdmin: TestSession;
  let editor: TestSession;
  let finance: TestSession;

  beforeAll(async () => {
    context = await createE2eTestContext();
    superAdmin = await authenticatedSession(
      context.app,
      context.actors.superAdmin.email,
      E2E_PASSWORD,
    );
    editor = await authenticatedSession(context.app, context.actors.editor.email, E2E_PASSWORD);
    finance = await authenticatedSession(context.app, context.actors.finance.email, E2E_PASSWORD);
  });
  afterAll(async () => closeE2eTestContext(context));

  it('uploads, lists, and deletes media through simulated object storage', async () => {
    await request(context.app.getHttpServer()).get('/api/v1/admin/media').expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/media')
      .set('Authorization', finance.authorization)
      .expect(403);
    const uploaded = await request(context.app.getHttpServer())
      .post('/api/v1/admin/media/upload')
      .set('Authorization', editor.authorization)
      .field('languageCode', 'en')
      .field('altText', 'E2E program image')
      .attach('file', PNG_BYTES, { filename: 'program.png', contentType: 'image/png' })
      .expect(201);
    const id = uploaded.body.data.id as string;
    expect(context.storage.put).toHaveBeenCalled();
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/media?type=IMAGE')
      .set('Authorization', editor.authorization)
      .expect(200)
      .expect(({ body }) => expect(body.data.data).toHaveLength(1));
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/media/${id}`)
      .set('Authorization', editor.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/media/${id}`)
      .set('Authorization', superAdmin.authorization)
      .expect(200);
    expect(context.storage.delete).not.toHaveBeenCalled();
    expect(
      await context.db
        .select()
        .from(storageDeletionOutbox)
        .where(eq(storageDeletionOutbox.objectKey, uploaded.body.data.objectKey)),
    ).toEqual([expect.objectContaining({ status: 'PENDING' })]);
  });

  it('covers the gallery lifecycle and public metadata view', async () => {
    const uploaded = await request(context.app.getHttpServer())
      .post('/api/v1/admin/gallery')
      .set('Authorization', editor.authorization)
      .field('title', 'E2E Gallery Image')
      .field('altText', 'Children participating in a center activity')
      .field('languageCode', 'en')
      .attach('file', PNG_BYTES, { filename: 'gallery.png', contentType: 'image/png' })
      .expect(201);
    const id = uploaded.body.data.id as string;
    await request(context.app.getHttpServer())
      .get('/api/v1/public/gallery')
      .expect(200)
      .expect(({ body }) => expect(body.data.data[0].title).toBe('E2E Gallery Image'));
    await request(context.app.getHttpServer())
      .patch(`/api/v1/admin/gallery/${id}`)
      .set('Authorization', editor.authorization)
      .send({ title: 'Updated Gallery Image' })
      .expect(200);
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/gallery/${id}`)
      .set('Authorization', editor.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/gallery/${id}`)
      .set('Authorization', superAdmin.authorization)
      .expect(200);
    expect(context.storage.delete).not.toHaveBeenCalled();
  });
});
