import * as request from 'supertest';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { auditLogs, resourceDownloadLogs } from '../../src/database/schema';
import { authenticatedSession, TestSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

describe('Frontend demonstration content (e2e)', () => {
  let context: E2eTestContext;
  let admin: TestSession;
  let editor: TestSession;
  let finance: TestSession;
  beforeAll(async () => {
    context = await createE2eTestContext();
    admin = await authenticatedSession(context.app, context.actors.superAdmin.email, E2E_PASSWORD);
    editor = await authenticatedSession(context.app, context.actors.editor.email, E2E_PASSWORD);
    finance = await authenticatedSession(context.app, context.actors.finance.email, E2E_PASSWORD);
  });
  afterAll(async () => closeE2eTestContext(context));

  it('serves homepage and FAQ compositions with SEO metadata', async () => {
    await request(context.app.getHttpServer())
      .get('/api/v1/public/content/homepage?languageCode=en')
      .expect(200)
      .expect(({ body }) =>
        expect(body.data).toMatchObject({
          sections: [expect.objectContaining({ type: 'hero' })],
          seo: { title: 'Nehemiah Autism Center' },
        }),
      );
    await request(context.app.getHttpServer())
      .get('/api/v1/public/content/faqs?languageCode=en')
      .expect(200)
      .expect(({ body }) => expect(body.data.items).toHaveLength(1));
  });

  it('publishes a blog and exposes it through public search', async () => {
    const created = await request(context.app.getHttpServer())
      .post('/api/v1/admin/blog')
      .set('Authorization', admin.authorization)
      .send({
        slug: 'family-support',
        languageCode: 'en',
        title: 'Family Support',
        excerpt: 'Practical family guidance',
        content: 'Practical autism support for every family.',
        seoTitle: 'Family Autism Support',
        seoDescription: 'A practical support guide.',
      })
      .expect(201);
    await request(context.app.getHttpServer())
      .get(`/api/v1/public/blog/${created.body.data.slug}?languageCode=en`)
      .expect(404);
    await request(context.app.getHttpServer())
      .patch(`/api/v1/admin/blog/${created.body.data.id}`)
      .set('Authorization', admin.authorization)
      .send({ title: 'Updated Family Support' })
      .expect(200);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/blog?languageCode=en')
      .set('Authorization', admin.authorization)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: created.body.data.id, title: 'Updated Family Support' }),
          ]),
        ),
      );
    await request(context.app.getHttpServer())
      .post(`/api/v1/admin/blog/${created.body.data.id}/publish`)
      .set('Authorization', admin.authorization)
      .expect(201);
    await request(context.app.getHttpServer())
      .get(`/api/v1/public/blog/${created.body.data.slug}?languageCode=en`)
      .expect(200)
      .expect(({ body }) => expect(body.data.seoTitle).toBe('Family Autism Support'));
    await request(context.app.getHttpServer())
      .get('/api/v1/public/blog?languageCode=en')
      .expect(200)
      .expect(({ body }) =>
        expect(body.data.data).toEqual(
          expect.arrayContaining([expect.objectContaining({ id: created.body.data.id })]),
        ),
      );
    await request(context.app.getHttpServer())
      .get('/api/v1/public/search?q=autism&languageCode=en')
      .expect(200)
      .expect(({ body }) =>
        expect(body.data.results).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ type: 'blog', slug: 'family-support' }),
          ]),
        ),
      );
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/blog/${created.body.data.id}`)
      .set('Authorization', admin.authorization)
      .expect(200);

    const logs = await context.db
      .select()
      .from(auditLogs)
      .where(
        and(eq(auditLogs.entityType, 'BLOG_POST'), eq(auditLogs.entityId, created.body.data.id)),
      );
    expect(logs.map((log) => log.action)).toEqual(
      expect.arrayContaining(['CREATE', 'UPDATE', 'PUBLISH', 'DELETE']),
    );
    expect(logs.every((log) => log.adminId === context.actors.superAdmin.id)).toBe(true);
  });

  it('counts resource downloads and exports a published event as iCal', async () => {
    const resource = await request(context.app.getHttpServer())
      .post('/api/v1/admin/resources')
      .set('Authorization', admin.authorization)
      .send({
        title: 'Family Guide',
        description: 'A free local guide',
        fileUrl: 'http://localhost:9000/nehemiah-media/guides/family.pdf',
        fileName: 'family.pdf',
        mimeType: 'application/pdf',
        languageCode: 'en',
      })
      .expect(201);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/resources?languageCode=en')
      .set('Authorization', admin.authorization)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data.data).toEqual(
          expect.arrayContaining([expect.objectContaining({ id: resource.body.data.id })]),
        ),
      );
    await request(context.app.getHttpServer())
      .get('/api/v1/public/resources?languageCode=en')
      .expect(200)
      .expect(({ body }) =>
        expect(body.data.data).not.toEqual(
          expect.arrayContaining([expect.objectContaining({ id: resource.body.data.id })]),
        ),
      );
    await request(context.app.getHttpServer())
      .get(`/api/v1/public/resources/${resource.body.data.id}/download`)
      .expect(404);
    await request(context.app.getHttpServer())
      .post(`/api/v1/admin/resources/${resource.body.data.id}/publish`)
      .set('Authorization', admin.authorization)
      .expect(201);
    await request(context.app.getHttpServer())
      .get('/api/v1/public/resources?languageCode=en')
      .expect(200)
      .expect(({ body }) =>
        expect(body.data.data).toEqual(
          expect.arrayContaining([expect.objectContaining({ id: resource.body.data.id })]),
        ),
      );
    await request(context.app.getHttpServer())
      .get(`/api/v1/public/resources/${resource.body.data.id}/download`)
      .set('cf-ipcountry', 'ET')
      .expect(200)
      .expect(({ body }) => expect(body.data.downloadCount).toBe(1));
    const [downloadLog] = await context.db
      .select()
      .from(resourceDownloadLogs)
      .where(eq(resourceDownloadLogs.resourceId, resource.body.data.id));
    expect(downloadLog).toMatchObject({ country: 'ET' });
    expect(downloadLog.downloadedAt).toBeInstanceOf(Date);
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/resources/${resource.body.data.id}`)
      .set('Authorization', admin.authorization)
      .expect(200);

    const resourceLogs = await context.db
      .select()
      .from(auditLogs)
      .where(
        and(eq(auditLogs.entityType, 'RESOURCE'), eq(auditLogs.entityId, resource.body.data.id)),
      );
    expect(resourceLogs.map((log) => log.action)).toEqual(
      expect.arrayContaining(['CREATE', 'PUBLISH', 'DELETE']),
    );
    expect(resourceLogs.every((log) => log.adminId === context.actors.superAdmin.id)).toBe(true);

    const event = await request(context.app.getHttpServer())
      .post('/api/v1/admin/events')
      .set('Authorization', admin.authorization)
      .send({
        slug: 'family-day',
        title: 'Family Day',
        description: 'Community support',
        startDate: '2030-01-01T09:00:00.000Z',
        endDate: '2030-01-01T12:00:00.000Z',
        location: 'Addis Ababa',
        rsvpEnabled: false,
        status: 'PUBLISHED',
        languageCode: 'en',
      })
      .expect(201);
    expect(event.body.data.slug).toBe('family-day');
    await request(context.app.getHttpServer())
      .get('/api/v1/public/events/family-day/calendar.ics?languageCode=en')
      .expect('Content-Type', /text\/calendar/)
      .expect(200)
      .expect(({ text }) => expect(text).toContain('BEGIN:VEVENT'));
  });

  it('rejects a disallowed role for every blog and resource mutation', async () => {
    const id = randomUUID();
    const blog = {
      slug: 'forbidden-blog',
      languageCode: 'en',
      title: 'Forbidden blog',
      excerpt: 'This request must not reach the service.',
      content: 'Role guards reject it first.',
    };
    const resource = {
      title: 'Forbidden resource',
      description: 'This request must not reach the service.',
      fileUrl: 'http://localhost:9000/nehemiah-media/forbidden.pdf',
      fileName: 'forbidden.pdf',
      mimeType: 'application/pdf',
      languageCode: 'en',
    };

    await request(context.app.getHttpServer())
      .post('/api/v1/admin/blog')
      .set('Authorization', finance.authorization)
      .send(blog)
      .expect(403);
    await request(context.app.getHttpServer())
      .patch(`/api/v1/admin/blog/${id}`)
      .set('Authorization', finance.authorization)
      .send({ title: 'Forbidden update' })
      .expect(403);
    await request(context.app.getHttpServer())
      .post(`/api/v1/admin/blog/${id}/publish`)
      .set('Authorization', finance.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/blog/${id}`)
      .set('Authorization', finance.authorization)
      .expect(403);

    await request(context.app.getHttpServer())
      .post('/api/v1/admin/resources')
      .set('Authorization', finance.authorization)
      .send(resource)
      .expect(403);
    await request(context.app.getHttpServer())
      .post(`/api/v1/admin/resources/${id}/publish`)
      .set('Authorization', finance.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/resources/${id}`)
      .set('Authorization', finance.authorization)
      .expect(403);

    // Content editors may mutate content, but destructive deletion is super-admin only.
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/blog/${id}`)
      .set('Authorization', editor.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/resources/${id}`)
      .set('Authorization', editor.authorization)
      .expect(403);
  });

  it('rejects resource locations and MIME types outside the local-safe allowlist', async () => {
    const validResource = {
      title: 'Unsafe resource',
      description: 'Validation must reject this before persistence.',
      fileName: 'unsafe.exe',
      languageCode: 'en',
    };
    await request(context.app.getHttpServer())
      .post('/api/v1/admin/resources')
      .set('Authorization', admin.authorization)
      .send({
        ...validResource,
        fileUrl: 'https://attacker.example/unsafe.pdf',
        mimeType: 'application/pdf',
      })
      .expect(400);
    await request(context.app.getHttpServer())
      .post('/api/v1/admin/resources')
      .set('Authorization', admin.authorization)
      .send({
        ...validResource,
        fileUrl: 'http://localhost:9000/nehemiah-media/unsafe.exe',
        mimeType: 'application/x-msdownload',
      })
      .expect(400);
  });
});
