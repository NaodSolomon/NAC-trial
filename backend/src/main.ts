import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
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

  configureApp(app);
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('app.port');
  const host = config.getOrThrow<string>('app.host');

  await app.listen(port, host);
  logger.log(`API listening at http://${host}:${port}/api/v1`);
}

void bootstrap();
