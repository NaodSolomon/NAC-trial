import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './data-source';

async function runMigrations(): Promise<void> {
  const migrationsFolder = resolve(process.cwd(), 'dist/database/migrations');
  const migrationJournal = resolve(migrationsFolder, 'meta/_journal.json');

  try {
    if (!existsSync(migrationJournal)) {
      throw new Error(
        `Packaged migration journal is missing at ${migrationJournal}. Refusing to start an incomplete deployment.`,
      );
    }

    await migrate(db, { migrationsFolder });
  } finally {
    await pool.end();
  }
}

void runMigrations().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration failure';
  console.error(`Database migration failed: ${message}`);
  process.exitCode = 1;
});
