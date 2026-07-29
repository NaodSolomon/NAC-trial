import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

async function run(): Promise<void> {
  const pool = new Pool({
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? 'password',
    database: process.env.DATABASE_NAME ?? 'appdb',
  });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: resolve(__dirname, 'migrations'),
    });
  } finally {
    await pool.end();
  }
}

void run();
