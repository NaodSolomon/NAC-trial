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
}

function parsePort(value: unknown, name: string, fallback: number): number {
  const port = Number(value ?? fallback);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }

  return port;
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

  if (
    environment === 'production' &&
    new Set([accessSecret, refreshSecret, ipHashSecret]).size !== 3
  ) {
    throw new Error('JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, and IP_HASH_SECRET must be different');
  }

  return {
    ...raw,
    NODE_ENV: environment,
    API_HOST: String(raw.API_HOST ?? '0.0.0.0'),
    API_PORT: parsePort(raw.API_PORT, 'API_PORT', 8000),
    FRONTEND_URL: String(raw.FRONTEND_URL ?? 'http://localhost:3000'),
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
  };
}
