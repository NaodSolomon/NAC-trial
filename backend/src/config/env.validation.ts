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
  JWT_SECRET?: string;
  JWT_EXPIRY: string;
}

function parsePort(value: unknown, name: string, fallback: number): number {
  const port = Number(value ?? fallback);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }

  return port;
}

function requireProductionSecret(
  value: unknown,
  name: string,
  environment: Environment,
): string | undefined {
  const secret = typeof value === 'string' ? value.trim() : undefined;

  if (environment === 'production' && (!secret || secret.length < 32)) {
    throw new Error(`${name} must contain at least 32 characters in production`);
  }

  return secret;
}

export function validateEnvironment(raw: Record<string, unknown>): EnvironmentVariables {
  const environment = (raw.NODE_ENV ?? 'development') as Environment;

  if (!ENVIRONMENTS.includes(environment)) {
    throw new Error(`NODE_ENV must be one of: ${ENVIRONMENTS.join(', ')}`);
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
    JWT_SECRET: requireProductionSecret(raw.JWT_SECRET, 'JWT_SECRET', environment),
    JWT_EXPIRY: String(raw.JWT_EXPIRY ?? '15m'),
  };
}
