import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { createOpenApiDocument } from './setup-openapi';

async function generateOpenApi(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: false,
  });
  try {
    configureApp(app);
    const document = createOpenApiDocument(app);
    const outputDirectory = join(process.cwd(), 'dist');
    const outputPath = join(outputDirectory, 'openapi.json');
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    process.stdout.write(`Generated ${outputPath}\n`);
  } finally {
    await app.close();
  }
}

void generateOpenApi();
