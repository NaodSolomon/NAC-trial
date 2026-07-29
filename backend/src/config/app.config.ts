import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  host: process.env.API_HOST ?? '0.0.0.0',
  port: Number(process.env.API_PORT ?? 8000),
  env: process.env.NODE_ENV ?? 'development',
  frontendUrl: (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',')[0].trim(),
  corsOrigins: (process.env.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  internalApiKey: process.env.INTERNAL_API_KEY ?? 'development-internal-api-key-change-me',
  swaggerEnabled:
    process.env.SWAGGER_ENABLED !== undefined
      ? process.env.SWAGGER_ENABLED === 'true'
      : process.env.NODE_ENV !== 'production',
}));
