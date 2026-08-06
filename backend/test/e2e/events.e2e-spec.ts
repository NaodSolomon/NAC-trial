import * as request from 'supertest';
import { DatabaseUnavailableError } from '../../src/database/database-unavailable.error';
import {
  EVENT_REPOSITORY,
  EventRepository,
} from '../../src/modules/events/interfaces/event-repository.interface';
import { authenticatedSession, TestSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

describe('Events and RSVP (e2e)', () => {
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

  it('protects administration and completes a published event and RSVP workflow', async () => {
    await request(context.app.getHttpServer()).get('/api/v1/admin/events').expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/events')
      .set('Authorization', finance.authorization)
      .expect(403);
    const created = await request(context.app.getHttpServer())
      .post('/api/v1/admin/events')
      .set('Authorization', editor.authorization)
      .send({
        slug: 'e2e-family-day',
        title: 'E2E Family Day',
        description: 'A welcoming family event for the center community.',
        startDate: '2030-08-10T09:00:00.000Z',
        endDate: '2030-08-10T12:00:00.000Z',
        location: 'Nehemiah Autism Center',
        rsvpEnabled: true,
        status: 'PUBLISHED',
        languageCode: 'en',
      })
      .expect(201);
    const id = created.body.data.id as string;
    await request(context.app.getHttpServer())
      .patch(`/api/v1/admin/events/${id}`)
      .set('Authorization', editor.authorization)
      .send({ location: 'NAC Main Hall' })
      .expect(200);
    await request(context.app.getHttpServer())
      .get('/api/v1/public/events')
      .expect(200)
      .expect(({ body }) => expect(body.data.data).toHaveLength(1));
    await request(context.app.getHttpServer()).get('/api/v1/public/events/e2e-family-day').expect(200);
    await request(context.app.getHttpServer())
      .post(`/api/v1/public/events/${id}/rsvp`)
      .send({ name: 'E2E Guest', email: 'guest@e2e.test', attendees: 2 })
      .expect(201);
    await request(context.app.getHttpServer())
      .post(`/api/v1/public/events/${id}/rsvp`)
      .send({ name: 'Duplicate Guest', email: 'guest@e2e.test', attendees: 1 })
      .expect(409);
    await request(context.app.getHttpServer())
      .get(`/api/v1/admin/events/${id}/rsvps`)
      .set('Authorization', editor.authorization)
      .expect(200);
    await request(context.app.getHttpServer())
      .get(`/api/v1/admin/events/${id}/rsvps/export`)
      .set('Authorization', editor.authorization)
      .expect('Content-Type', /text\/csv/)
      .expect(200);
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/events/${id}`)
      .set('Authorization', editor.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .delete(`/api/v1/admin/events/${id}`)
      .set('Authorization', superAdmin.authorization)
      .expect(200);
  });

  it('returns a controlled 503 when the event-list database query is unavailable', async () => {
    const repository = context.app.get<EventRepository>(EVENT_REPOSITORY);
    const list = jest
      .spyOn(repository, 'list')
      .mockRejectedValueOnce(
        new DatabaseUnavailableError('events.list', new Error('pool acquisition timeout')),
      );

    try {
      await request(context.app.getHttpServer())
        .get('/api/v1/public/events?languageCode=en&page=1&limit=10')
        .expect(503)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            success: false,
            statusCode: 503,
            message: 'Events are temporarily unavailable',
          }),
        );
    } finally {
      list.mockRestore();
    }
  });
});
