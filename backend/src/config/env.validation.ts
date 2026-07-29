const ENVIRONMENTS = ['development', 'test', 'production'] as const;

type Environment = (typeof ENVIRONMENTS)[number];

export interface EnvironmentVariables extends Record<string, unknown> {
  NODE_ENV: Environment;
  API_HOST: string;
  API_PORT: number;
  FRONTEND_URL: string;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRY: string;
  JWT_REFRESH_EXPIRY: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  IP_HASH_SECRET: string;
  INTERNAL_API_KEY: string;
  STORAGE_ENDPOINT: string;
  STORAGE_REGION: string;
  STORAGE_BUCKET: string;
  STORAGE_ACCESS_KEY_ID: string;
  STORAGE_SECRET_ACCESS_KEY: string;
  STORAGE_PUBLIC_URL: string;
  MEDIA_MAX_FILE_SIZE_BYTES: number;
  REQUEST_BODY_LIMIT_BYTES: number;
  PAYPAL_ENABLED: boolean;
  PAYPAL_BASE_URL: string;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  PAYPAL_WEBHOOK_ID: string;
  PAYPAL_RETURN_URL: string;
  PAYPAL_CANCEL_URL: string;
  SWAGGER_ENABLED: boolean;
  STORAGE_DRIVER: 'minio' | 'r2';
  MAIL_DRIVER: 'mailpit';
  PAYMENT_DRIVER: 'fake' | 'paypal';
  CACHE_DRIVER: 'redis';
  PAYMENTS_ENABLED: boolean;
  MAIL_HOST: string;
  MAIL_PORT: number;
  MAIL_FROM: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
}

function parseChoice<T extends string>(
  value: unknown,
  name: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const selected = String(value ?? fallback) as T;
  if (!allowed.includes(selected)) throw new Error(`${name} must be one of: ${allowed.join(', ')}`);
  return selected;
}

function parsePort(value: unknown, name: string, fallback: number): number {
  const port = Number(value ?? fallback);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }

  return port;
}

function parsePositiveInteger(value: unknown, name: string, fallback: number): number {
  const parsed = Number(value ?? fallback);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

function parseBoundedInteger(
  value: unknown,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function validateUrl(value: unknown, name: string, fallback: string): string {
  const url = String(value ?? fallback).replace(/\/+$/, '');

  try {
    new URL(url);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }

  return url;
}

function requiredInProduction(
  value: unknown,
  name: string,
  environment: Environment,
  developmentFallback: string,
): string {
  const supplied = typeof value === 'string' ? value.trim() : '';
  if (environment === 'production' && !supplied) {
    throw new Error(`${name} is required in production`);
  }
  return supplied || developmentFallback;
}

function parseBoolean(value: unknown, fallback = false): boolean {
  if (value === undefined) return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new Error('Boolean environment values must be true or false');
}

function validateSecret(
  value: unknown,
  name: string,
  environment: Environment,
  developmentFallback: string,
): string {
  const suppliedSecret = typeof value === 'string' && value.trim() ? value.trim() : undefined;
  const secret = suppliedSecret ?? developmentFallback;

  if (environment === 'production' && (!suppliedSecret || suppliedSecret.length < 32)) {
    throw new Error(`${name} must contain at least 32 characters in production`);
  }
  if (
    environment === 'production' &&
    (/replace|change-me|password|secret/i.test(secret) || /\s/.test(secret))
  ) {
    throw new Error(`${name} contains a placeholder or whitespace`);
  }

  return secret;
}

function validateDuration(value: unknown, name: string, fallback: string): string {
  const duration = String(value ?? fallback);

  if (!/^\d+[smhd]$/.test(duration)) {
    throw new Error(`${name} must use a duration such as 15m, 1h, or 7d`);
  }

  return duration;
}

export function validateEnvironment(raw: Record<string, unknown>): EnvironmentVariables {
  const environment = (raw.NODE_ENV ?? 'development') as Environment;

  if (!ENVIRONMENTS.includes(environment)) {
    throw new Error(`NODE_ENV must be one of: ${ENVIRONMENTS.join(', ')}`);
  }

  const accessSecret = validateSecret(
    raw.JWT_ACCESS_SECRET,
    'JWT_ACCESS_SECRET',
    environment,
    'development-access-secret-change-me',
  );
  const refreshSecret = validateSecret(
    raw.JWT_REFRESH_SECRET,
    'JWT_REFRESH_SECRET',
    environment,
    'development-refresh-secret-change-me',
  );
  const ipHashSecret = validateSecret(
    raw.IP_HASH_SECRET,
    'IP_HASH_SECRET',
    environment,
    'development-ip-hash-secret-change-me',
  );
  const internalApiKey = validateSecret(
    raw.INTERNAL_API_KEY,
    'INTERNAL_API_KEY',
    environment,
    'development-internal-api-key-change-me',
  );
  const paypalEnabled = parseBoolean(raw.PAYPAL_ENABLED);
  const paymentsEnabled = parseBoolean(raw.PAYMENTS_ENABLED);
  const paymentDriver = parseChoice(raw.PAYMENT_DRIVER, 'PAYMENT_DRIVER', ['fake', 'paypal'], 'fake');
  if (paymentDriver === 'paypal' && paymentsEnabled && !paypalEnabled) {
    throw new Error('PAYPAL_ENABLED must be true when real PayPal payments are enabled');
  }
  const frontendOrigins = String(raw.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => validateUrl(origin.trim(), 'FRONTEND_URL', 'http://localhost:3000'));
  const paypalRequired = (value: unknown, name: string, fallback = '') =>
    paymentDriver === 'paypal' && paymentsEnabled && paypalEnabled
      ? requiredInProduction(value, name, 'production', fallback)
      : String(value ?? fallback);

  if (
    environment === 'production' &&
    new Set([accessSecret, refreshSecret, ipHashSecret, internalApiKey]).size !== 4
  ) {
    throw new Error(
      'JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, IP_HASH_SECRET, and INTERNAL_API_KEY must be different',
    );
  }
  if (
    environment === 'production' &&
    frontendOrigins.some((origin) => !origin.startsWith('https://'))
  ) {
    throw new Error('FRONTEND_URL origins must use HTTPS in production');
  }

  return {
    ...raw,
    NODE_ENV: environment,
    API_HOST: String(raw.API_HOST ?? '0.0.0.0'),
    API_PORT: parsePort(raw.API_PORT, 'API_PORT', 8000),
    FRONTEND_URL: frontendOrigins.join(','),
    DATABASE_HOST: String(raw.DATABASE_HOST ?? 'localhost'),
    DATABASE_PORT: parsePort(raw.DATABASE_PORT, 'DATABASE_PORT', 5432),
    DATABASE_USER: String(raw.DATABASE_USER ?? 'postgres'),
    DATABASE_PASSWORD: String(raw.DATABASE_PASSWORD ?? 'password'),
    DATABASE_NAME: String(raw.DATABASE_NAME ?? 'appdb'),
    JWT_ACCESS_SECRET: accessSecret,
    JWT_REFRESH_SECRET: refreshSecret,
    JWT_ACCESS_EXPIRY: validateDuration(raw.JWT_ACCESS_EXPIRY, 'JWT_ACCESS_EXPIRY', '15m'),
    JWT_REFRESH_EXPIRY: validateDuration(raw.JWT_REFRESH_EXPIRY, 'JWT_REFRESH_EXPIRY', '7d'),
    JWT_ISSUER: String(raw.JWT_ISSUER ?? 'nehemiah-api'),
    JWT_AUDIENCE: String(raw.JWT_AUDIENCE ?? 'nehemiah-admin'),
    IP_HASH_SECRET: ipHashSecret,
    INTERNAL_API_KEY: internalApiKey,
    STORAGE_ENDPOINT: validateUrl(
      requiredInProduction(
        raw.STORAGE_ENDPOINT,
        'STORAGE_ENDPOINT',
        environment,
        'http://localhost:9000',
      ),
      'STORAGE_ENDPOINT',
      'http://localhost:9000',
    ),
    STORAGE_REGION: String(raw.STORAGE_REGION ?? 'auto'),
    STORAGE_BUCKET: requiredInProduction(
      raw.STORAGE_BUCKET,
      'STORAGE_BUCKET',
      environment,
      'nehemiah-media',
    ),
    STORAGE_ACCESS_KEY_ID: requiredInProduction(
      raw.STORAGE_ACCESS_KEY_ID,
      'STORAGE_ACCESS_KEY_ID',
      environment,
      'minioadmin',
    ),
    STORAGE_SECRET_ACCESS_KEY: requiredInProduction(
      raw.STORAGE_SECRET_ACCESS_KEY,
      'STORAGE_SECRET_ACCESS_KEY',
      environment,
      'minioadmin',
    ),
    STORAGE_PUBLIC_URL: validateUrl(
      requiredInProduction(
        raw.STORAGE_PUBLIC_URL,
        'STORAGE_PUBLIC_URL',
        environment,
        'http://localhost:9000/nehemiah-media',
      ),
      'STORAGE_PUBLIC_URL',
      'http://localhost:9000/nehemiah-media',
    ),
    MEDIA_MAX_FILE_SIZE_BYTES: parsePositiveInteger(
      raw.MEDIA_MAX_FILE_SIZE_BYTES,
      'MEDIA_MAX_FILE_SIZE_BYTES',
      10_485_760,
    ),
    REQUEST_BODY_LIMIT_BYTES: parseBoundedInteger(
      raw.REQUEST_BODY_LIMIT_BYTES,
      'REQUEST_BODY_LIMIT_BYTES',
      1_048_576,
      1_024,
      5_242_880,
    ),
    PAYPAL_ENABLED: paypalEnabled,
    PAYMENTS_ENABLED: paymentsEnabled,
    PAYMENT_DRIVER: paymentDriver,
    STORAGE_DRIVER: parseChoice(raw.STORAGE_DRIVER, 'STORAGE_DRIVER', ['minio', 'r2'], 'minio'),
    MAIL_DRIVER: parseChoice(raw.MAIL_DRIVER, 'MAIL_DRIVER', ['mailpit'], 'mailpit'),
    CACHE_DRIVER: parseChoice(raw.CACHE_DRIVER, 'CACHE_DRIVER', ['redis'], 'redis'),
    MAIL_HOST: String(raw.MAIL_HOST ?? 'mailpit'),
    MAIL_PORT: parsePort(raw.MAIL_PORT, 'MAIL_PORT', 1025),
    MAIL_FROM: String(raw.MAIL_FROM ?? 'noreply@nehemiah.local'),
    REDIS_HOST: String(raw.REDIS_HOST ?? 'redis'),
    REDIS_PORT: parsePort(raw.REDIS_PORT, 'REDIS_PORT', 6379),
    PAYPAL_BASE_URL: validateUrl(
      raw.PAYPAL_BASE_URL,
      'PAYPAL_BASE_URL',
      'https://api-m.sandbox.paypal.com',
    ),
    PAYPAL_CLIENT_ID: paypalRequired(raw.PAYPAL_CLIENT_ID, 'PAYPAL_CLIENT_ID'),
    PAYPAL_CLIENT_SECRET: paypalRequired(raw.PAYPAL_CLIENT_SECRET, 'PAYPAL_CLIENT_SECRET'),
    PAYPAL_WEBHOOK_ID: paypalRequired(raw.PAYPAL_WEBHOOK_ID, 'PAYPAL_WEBHOOK_ID'),
    PAYPAL_RETURN_URL: validateUrl(
      paypalRequired(
        raw.PAYPAL_RETURN_URL,
        'PAYPAL_RETURN_URL',
        'http://localhost:3000/donate/success',
      ),
      'PAYPAL_RETURN_URL',
      'http://localhost:3000/donate/success',
    ),
    PAYPAL_CANCEL_URL: validateUrl(
      paypalRequired(
        raw.PAYPAL_CANCEL_URL,
        'PAYPAL_CANCEL_URL',
        'http://localhost:3000/donate/cancel',
      ),
      'PAYPAL_CANCEL_URL',
      'http://localhost:3000/donate/cancel',
    ),
    SWAGGER_ENABLED: parseBoolean(raw.SWAGGER_ENABLED, environment !== 'production'),
  };
}
