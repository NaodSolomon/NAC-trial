import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';

describe('Application conventions (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not expose public registration', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: 'visitor@example.com',
        name: 'Visitor',
        password: 'not-a-real-password',
      })
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 404,
      path: '/api/v1/users',
    });
    expect(response.body.timestamp).toBeDefined();
  });

  it('sets hardened response headers and a request correlation id', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/users').expect(404);
    expect(response.headers).toMatchObject({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'cross-origin-resource-policy': 'same-site',
      'cache-control': 'no-store',
    });
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('rejects untrusted browser origins while allowing the configured frontend', async () => {
    await request(app.getHttpServer())
      .options('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);
    const rejected = await request(app.getHttpServer())
      .options('/api/v1/auth/login')
      .set('Origin', 'https://attacker.example')
      .set('Access-Control-Request-Method', 'POST')
      .expect(404);
    expect(rejected.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects oversized JSON bodies before controller execution', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'admin@example.com', password: 'x'.repeat(1_050_000) })
      .expect(413);
  });

  it('validates login requests before accessing authentication services', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'not-an-email',
        password: 'short',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 400,
      path: '/api/v1/auth/login',
    });
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'email must be an email',
        'password must be longer than or equal to 8 characters',
      ]),
    );
  });

  it('protects the current-administrator endpoint', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      path: '/api/v1/auth/me',
    });
  });

  it.each([
    '/api/v1/admin/users',
    '/api/v1/admin/audit-logs',
    '/api/v1/admin/cms/pages',
    '/api/v1/admin/navigation',
    '/api/v1/admin/settings',
    '/api/v1/admin/media',
    '/api/v1/admin/contact',
    '/api/v1/admin/volunteers',
    '/api/v1/admin/testimonials',
    '/api/v1/admin/newsletter',
    '/api/v1/admin/donations',
    '/api/v1/admin/analytics/summary',
  ])('protects the private administration endpoint %s', async (endpoint) => {
    const response = await request(app.getHttpServer()).get(endpoint).expect(401);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      path: endpoint,
    });
  });

  it('protects the gallery upload endpoint', async () => {
    const endpoint = '/api/v1/admin/gallery';
    const response = await request(app.getHttpServer()).post(endpoint).expect(401);
    expect(response.body).toMatchObject({ success: false, statusCode: 401, path: endpoint });
  });

  it('validates anonymous analytics before persistence', async () => {
    const endpoint = '/api/v1/public/analytics/events';
    const response = await request(app.getHttpServer())
      .post(endpoint)
      .send({
        eventType: 'page_view',
        pageUrl: 'https://attacker.example/tracker',
        deviceType: 'desktop',
        country: 'ET',
      })
      .expect(400);
    expect(response.body).toMatchObject({ success: false, statusCode: 400, path: endpoint });
  });

  it('protects the scheduled-publishing job with an internal API key', async () => {
    const endpoint = '/api/v1/internal/jobs/publish-scheduled';
    const response = await request(app.getHttpServer()).post(endpoint).expect(401);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      path: endpoint,
    });
  });

  it('validates public contact submissions before persistence', async () => {
    const endpoint = '/api/v1/public/contact';
    const response = await request(app.getHttpServer())
      .post(endpoint)
      .send({
        name: 'J',
        email: 'not-an-email',
        message: 'short',
        languageCode: 'unsupported',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 400,
      path: endpoint,
    });
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'name must be longer than or equal to 2 characters',
        'email must be an email',
        'message must be longer than or equal to 10 characters',
        'languageCode must be one of the following values: en, am',
      ]),
    );
  });

  it('validates volunteer applications before persistence', async () => {
    const endpoint = '/api/v1/public/volunteer/apply';
    const response = await request(app.getHttpServer())
      .post(endpoint)
      .send({
        name: 'J',
        email: 'not-an-email',
        phone: '12',
        roleInterest: '',
        message: 'Too short',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 400,
      path: endpoint,
    });
  });

  it('validates newsletter signup before persistence', async () => {
    const endpoint = '/api/v1/public/newsletter';
    const response = await request(app.getHttpServer())
      .post(endpoint)
      .send({ email: 'not-an-email' })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 400,
      path: endpoint,
    });
  });

  it('does not accept draft-status filtering on public testimonials', async () => {
    const endpoint = '/api/v1/public/testimonials?status=DRAFT';
    const response = await request(app.getHttpServer()).get(endpoint).expect(400);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 400,
    });
  });

  it('validates donation initiation before payment-provider access', async () => {
    const endpoint = '/api/v1/public/donations';
    const response = await request(app.getHttpServer())
      .post(endpoint)
      .send({
        amount: -1,
        currency: 'GBP',
        gateway: 'CBE',
        donorName: 'Donor',
        donorEmail: 'not-an-email',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 400,
      path: endpoint,
    });
  });

  it.each(['/api/v1/webhooks/telebirr', '/api/v1/webhooks/cbe'])(
    'fails closed for the unconfigured provider route %s',
    async (endpoint) => {
      await request(app.getHttpServer()).post(endpoint).send({}).expect(503);
    },
  );

  it('enforces the lower rate limit on sensitive public writes', async () => {
    const endpoint = '/api/v1/public/contact';
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await request(app.getHttpServer()).post(endpoint).send({}).expect(400);
    }
    const response = await request(app.getHttpServer()).post(endpoint).send({}).expect(429);
    expect(response.body).toMatchObject({ success: false, statusCode: 429, path: endpoint });
  });
});
