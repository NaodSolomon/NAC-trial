import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupOpenApi(app: INestApplication): void {
  const config = app.get(ConfigService);
  if (!config.getOrThrow<boolean>('app.swaggerEnabled')) return;

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Nehemiah Autism Center API')
      .setDescription('Versioned API for the Nehemiah Autism Center website and administration.')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'admin-jwt')
      .build(),
  );
  for (const [path, operations] of Object.entries(document.paths)) {
    if (!path.startsWith('/api/v1/admin/')) continue;
    for (const operation of Object.values(operations ?? {})) {
      if (operation && typeof operation === 'object' && 'responses' in operation) {
        operation.security = [{ 'admin-jwt': [] }];
      }
    }
  }
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'docs/openapi.json',
    customSiteTitle: 'Nehemiah API Documentation',
  });
}
