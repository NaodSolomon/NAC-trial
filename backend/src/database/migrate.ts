import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './data-source';

async function run(): Promise<void> {
  try {
    await migrate(db, {
      migrationsFolder: resolve(__dirname, 'migrations'),
    });
  } finally {
    await pool.end();
  }
}

void run();
