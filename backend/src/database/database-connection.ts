export type DatabaseConnectionOptions =
  | { connectionString: string }
  | {
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
    };

export function resolveDatabaseConnection(
  environment: NodeJS.ProcessEnv = process.env,
): DatabaseConnectionOptions {
  const connectionString =
    environment.NODE_ENV === 'test'
      ? (environment.TEST_DATABASE_URL ?? environment.DATABASE_URL)
      : environment.DATABASE_URL;

  if (connectionString?.trim()) {
    return { connectionString: connectionString.trim() };
  }

  return {
    host: environment.DATABASE_HOST ?? 'localhost',
    port: parseDatabasePort(environment.DATABASE_PORT),
    user: environment.DATABASE_USER ?? 'postgres',
    password: environment.DATABASE_PASSWORD ?? 'password',
    database: environment.DATABASE_NAME ?? 'appdb',
  };
}

function parseDatabasePort(value: string | undefined): number {
  const port = Number(value ?? 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('DATABASE_PORT must be an integer between 1 and 65535');
  }
  return port;
}
