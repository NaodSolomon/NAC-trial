import * as request from 'supertest';
import { authenticatedSession, TestSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext, createE2eTestContext, E2eTestContext, E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

describe('Frontend demonstration content (e2e)', () => {
  let context: E2eTestContext;
  let admin: TestSession;
  beforeAll(async () => {
    context = await createE2eTestContext();
    admin = await authenticatedSession(context.app, context.actors.superAdmin.email, E2E_PASSWORD);
  });
  afterAll(async () => closeE2eTestContext(context));

  it('serves homepage and FAQ compositions with SEO metadata', async () => {
    await request(context.app.getHttpServer()).get('/api/v1/public/content/homepage?languageCode=en')
      .expect(200).expect(({ body }) => expect(body.data).toMatchObject({
        sections: [expect.objectContaining({ type: 'hero' })],
        seo: { title: 'Nehemiah Autism Center' },
      }));
    await request(context.app.getHttpServer()).get('/api/v1/public/content/faqs?languageCode=en')
      .expect(200).expect(({ body }) => expect(body.data.items).toHaveLength(1));
  });

  it('publishes a blog and exposes it through public search', async () => {
    const created = await request(context.app.getHttpServer()).post('/api/v1/admin/blog')
      .set('Authorization', admin.authorization).send({
        slug: 'family-support', languageCode: 'en', title: 'Family Support',
        excerpt: 'Practical family guidance', content: 'Practical autism support for every family.',
        seoTitle: 'Family Autism Support', seoDescription: 'A practical support guide.',
      }).expect(201);
    await request(context.app.getHttpServer()).get(`/api/v1/public/blog/${created.body.data.slug}?languageCode=en`).expect(404);
    await request(context.app.getHttpServer()).post(`/api/v1/admin/blog/${created.body.data.id}/publish`)
      .set('Authorization', admin.authorization).expect(201);
    await request(context.app.getHttpServer()).get(`/api/v1/public/blog/${created.body.data.slug}?languageCode=en`)
      .expect(200).expect(({ body }) => expect(body.data.seoTitle).toBe('Family Autism Support'));
    await request(context.app.getHttpServer()).get('/api/v1/public/search?q=autism&languageCode=en')
      .expect(200).expect(({ body }) => expect(body.data.results).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'blog', slug: 'family-support' })]),
      ));
  });

  it('counts resource downloads and exports a published event as iCal', async () => {
    const resource = await request(context.app.getHttpServer()).post('/api/v1/admin/resources')
      .set('Authorization', admin.authorization).send({
        title: 'Family Guide', description: 'A free local guide',
        fileUrl: 'http://localhost:9000/nehemiah-media/guides/family.pdf',
        fileName: 'family.pdf', mimeType: 'application/pdf', languageCode: 'en',
      }).expect(201);
    await request(context.app.getHttpServer()).get(`/api/v1/public/resources/${resource.body.data.id}/download`).expect(404);
    await request(context.app.getHttpServer()).post(`/api/v1/admin/resources/${resource.body.data.id}/publish`)
      .set('Authorization', admin.authorization).expect(201);
    await request(context.app.getHttpServer()).get(`/api/v1/public/resources/${resource.body.data.id}/download`)
      .expect(200).expect(({ body }) => expect(body.data.downloadCount).toBe(1));

    const event = await request(context.app.getHttpServer()).post('/api/v1/admin/events')
      .set('Authorization', admin.authorization).send({
        slug: 'family-day', title: 'Family Day', description: 'Community support',
        startDate: '2030-01-01T09:00:00.000Z', endDate: '2030-01-01T12:00:00.000Z',
        location: 'Addis Ababa', rsvpEnabled: false, status: 'PUBLISHED', languageCode: 'en',
      }).expect(201);
    expect(event.body.data.slug).toBe('family-day');
    await request(context.app.getHttpServer()).get('/api/v1/public/events/family-day/calendar.ics?languageCode=en')
      .expect('Content-Type', /text\/calendar/).expect(200)
      .expect(({ text }) => expect(text).toContain('BEGIN:VEVENT'));
  });
});
