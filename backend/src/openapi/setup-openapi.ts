import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  ApiErrorResponseDto,
} from '../common/dto/api-response.dto';
import { completeOpenApiContract } from './complete-contract';

export function setupOpenApi(app: INestApplication): void {
  const config = app.get(ConfigService);
  if (!config.getOrThrow<boolean>('app.swaggerEnabled')) return;

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Nehemiah Autism Center API')
      .setDescription('Versioned API for the Nehemiah Autism Center website and administration.')
      .setVersion('1.0')
      .addServer('/', 'Current host')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'admin-jwt')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'X-Internal-API-Key' }, 'internal-api-key')
      .build(),
    {
      extraModels: [ApiErrorResponseDto],
    },
  );
  completeOpenApiContract(document);
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'docs/openapi.json',
    customSiteTitle: 'Nehemiah API Documentation',
  });
}
