import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import { resolveDatabaseConnection } from './src/database/database-connection';

dotenv.config();

const connection = resolveDatabaseConnection();

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials:
    'connectionString' in connection ? { url: connection.connectionString } : connection,
});
