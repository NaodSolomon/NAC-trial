import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { DatabaseConnectionOptions } from './database-connection';

export const DRIZZLE = 'DRIZZLE';
export const DATABASE_POOL = 'DATABASE_POOL';

export function createDatabasePool(config: ConfigService): Pool {
  const connection = config.getOrThrow<DatabaseConnectionOptions>('database.connection');
  const pool = new Pool({
    ...connection,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  const logger = new Logger('DatabasePool');

  // node-postgres emits errors from idle clients on the Pool EventEmitter.
  // A listener prevents a transient database outage from becoming an uncaught process error.
  pool.on('error', (error: Error & { code?: string }) => {
    const code = error.code ? ` (${error.code})` : '';
    logger.error(`PostgreSQL pool reported an idle client error${code}: ${error.message}`);
  });

  return pool;
}

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: createDatabasePool,
      inject: [ConfigService],
    },
    {
      provide: DRIZZLE,
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
      inject: [DATABASE_POOL],
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
