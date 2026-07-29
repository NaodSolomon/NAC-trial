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
  ])('protects the private administration endpoint %s', async (endpoint) => {
    const response = await request(app.getHttpServer()).get(endpoint).expect(401);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      path: endpoint,
    });
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
});
