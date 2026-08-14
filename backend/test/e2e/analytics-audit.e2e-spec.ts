import * as request from 'supertest';
import { authenticatedSession, TestSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

describe('Analytics and audit logs (e2e)', () => {
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

  it('tracks public analytics but protects aggregate reports', async () => {
    await request(context.app.getHttpServer())
      .post('/api/v1/public/analytics/events')
      .set('cf-ipcountry', 'ET')
      .send({ eventType: 'page_view', pageUrl: '/programs', deviceType: 'mobile' })
      .expect(201);
    await request(context.app.getHttpServer()).get('/api/v1/admin/analytics/summary').expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/analytics/summary')
      .set('Authorization', editor.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/analytics/summary')
      .set('Authorization', superAdmin.authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.totalVisitors).toBeGreaterThanOrEqual(1);
        expect(body.data.forms).toEqual(
          expect.objectContaining({
            totalSubmissions: expect.any(Number),
            contact: expect.any(Number),
            volunteer: expect.any(Number),
            newsletter: expect.any(Number),
            eventRsvp: expect.any(Number),
          }),
        );
        expect(body.data.resources).toEqual(
          expect.objectContaining({ totalDownloads: expect.any(Number) }),
        );
        expect(body.data.donations).toEqual(
          expect.objectContaining({
            totalDonations: expect.any(Number),
            statusCounts: expect.any(Array),
            confirmedValues: expect.any(Array),
          }),
        );
      });
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/analytics/timeline?range=month')
      .set('Authorization', superAdmin.authorization)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data[0]).toEqual(
          expect.objectContaining({
            visitors: expect.any(Number),
            formSubmissions: expect.any(Number),
            resourceDownloads: expect.any(Number),
            donationsCreated: expect.any(Number),
            donationsConfirmed: expect.any(Number),
            confirmedUsd: expect.any(String),
            confirmedEtb: expect.any(String),
          }),
        ),
      );
  });

  it('records administrative mutations and restricts the audit trail', async () => {
    await request(context.app.getHttpServer())
      .post('/api/v1/admin/navigation')
      .set('Authorization', editor.authorization)
      .send({ label: 'Audit Link', url: '/audit-link', order: 2, languageCode: 'en' })
      .expect(201);
    await request(context.app.getHttpServer()).get('/api/v1/admin/audit-logs').expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', editor.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', superAdmin.authorization)
      .expect(200)
      .expect(({ body }) => expect(body.data.data.length).toBeGreaterThan(0));
  });
});
