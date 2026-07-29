import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './data-source';

async function runMigrations(): Promise<void> {
  const builtMigrations = resolve(process.cwd(), 'dist/database/migrations');
  try {
    await migrate(db, {
      migrationsFolder: existsSync(builtMigrations)
        ? builtMigrations
        : resolve(process.cwd(), 'src/database/migrations'),
    });
  } finally {
    await pool.end();
  }
}

void runMigrations();
