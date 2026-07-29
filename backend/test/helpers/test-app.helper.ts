import { INestApplication } from '@nestjs/common';
import { TestingModuleBuilder, Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { setupOpenApi } from '../../src/openapi/setup-openapi';

export interface TestAppOptions {
  configureModule?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
  databaseUrl?: string;
}

export async function createTestApp(options: TestAppOptions = {}): Promise<INestApplication> {
  if (options.databaseUrl) process.env.DATABASE_URL = options.databaseUrl;
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (options.configureModule) builder = options.configureModule(builder);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  const config = app.get(ConfigService);
  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: config.getOrThrow<number>('storage.maxFileSizeBytes'),
      fields: 4,
      fieldSize: 2_000,
    },
  });
  configureApp(app);
  setupOpenApi(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
