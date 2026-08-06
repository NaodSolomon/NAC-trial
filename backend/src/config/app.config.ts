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
  rateLimitTtlMs: Number(process.env.RATE_LIMIT_TTL_MS ?? 60_000),
  rateLimitRequests: Number(process.env.RATE_LIMIT_REQUESTS ?? 100),
  httpSuccessLogSampleRate: Number(
    process.env.HTTP_LOG_SUCCESS_SAMPLE_RATE ??
      (process.env.NODE_ENV === 'production' ? 0.01 : 1),
  ),
  httpSlowRequestMs: Number(process.env.HTTP_SLOW_REQUEST_MS ?? 750),
}));
