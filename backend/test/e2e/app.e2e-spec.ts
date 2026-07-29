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
});
