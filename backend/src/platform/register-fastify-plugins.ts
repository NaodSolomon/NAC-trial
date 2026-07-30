import compress from '@fastify/compress';
import multipart from '@fastify/multipart';
import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

const COMPRESSION_THRESHOLD_BYTES = 1_024;

export async function registerFastifyPlugins(
  app: NestFastifyApplication,
  config: ConfigService,
): Promise<void> {
  await app.register(compress, {
    global: true,
    threshold: COMPRESSION_THRESHOLD_BYTES,
    encodings: ['gzip', 'deflate'],
  });
  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: config.getOrThrow<number>('storage.maxFileSizeBytes'),
      fields: 4,
      fieldSize: 2_000,
    },
  });
}
