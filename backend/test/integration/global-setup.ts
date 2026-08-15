import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { assertServiceSuitesCanRun } from '../helpers/service-availability.helper';
import { requireDedicatedTestDatabase } from '../helpers/test-database-safety.helper';

export default async function resetIntegrationDatabase(): Promise<void> {
  assertServiceSuitesCanRun();
  if (!process.env.TEST_DATABASE_URL) return;

  const connectionString = requireDedicatedTestDatabase();
  const pool = new Pool({ connectionString, max: 1 });
  try {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await migrate(drizzle(pool), {
      migrationsFolder: resolve(__dirname, '../../src/database/migrations'),
    });
  } finally {
    await pool.end();
  }
}
