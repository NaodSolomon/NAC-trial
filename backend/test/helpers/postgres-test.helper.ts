import { resolve } from 'node:path';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from '../../src/database/schema';
import { requireDedicatedTestDatabase } from './test-database-safety.helper';

export interface PostgresTestContext {
  db: NodePgDatabase<typeof schema>;
  pool: Pool;
}

export async function connectTestPostgres(): Promise<PostgresTestContext> {
  const connectionString = requireDedicatedTestDatabase();
  const pool = new Pool({ connectionString, max: 4 });
  const db = drizzle(pool, { schema });
  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../../src/database/migrations'),
  });
  return { db, pool };
}

export async function expectPostgresError(
  operation: Promise<unknown>,
  expectedCode: string,
): Promise<void> {
  try {
    await operation;
  } catch (error) {
    let current: unknown = error;
    while (current instanceof Error) {
      if ('code' in current && current.code === expectedCode) return;
      current = 'cause' in current ? current.cause : undefined;
    }
    throw error;
  }
  throw new Error(`Expected PostgreSQL error ${expectedCode}, but the operation succeeded`);
}
