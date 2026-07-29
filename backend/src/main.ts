import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
      bodyLimit: 1_048_576,
    }),
    {
      bufferLogs: true,
    },
  );

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
  app.enableShutdownHooks();

  const port = config.getOrThrow<number>('app.port');
  const host = config.getOrThrow<string>('app.host');

  await app.listen(port, host);
  logger.log(`API listening at http://${host}:${port}/api/v1`);
}

void bootstrap();
