import { resolve } from 'node:path';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from '../../src/database/schema';

export interface PostgresTestContext {
  db: NodePgDatabase<typeof schema>;
  pool: Pool;
}

export async function connectTestPostgres(): Promise<PostgresTestContext> {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) throw new Error('TEST_DATABASE_URL is required for integration tests');
  const pool = new Pool({ connectionString, max: 4 });
  const db = drizzle(pool, { schema });
  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../../src/database/migrations'),
  });
  return { db, pool };
}
