import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { resolveDatabaseConnection } from './database-connection';
import * as schema from './schema';

dotenv.config();

export const pool = new Pool(resolveDatabaseConnection());

export const db = drizzle(pool, { schema });
