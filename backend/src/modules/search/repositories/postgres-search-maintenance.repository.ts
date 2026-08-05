import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../../../database/drizzle.module';
import {
  SEARCH_TRIGRAM_INDEXES,
  SearchMaintenanceRepository,
  SearchReindexResult,
} from '../interfaces/search-maintenance-repository.interface';

const SEARCH_REINDEX_LOCK_NAMESPACE = 50_325;
const SEARCH_REINDEX_LOCK_ID = 26;

@Injectable()
export class PostgresSearchMaintenanceRepository implements SearchMaintenanceRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async rebuild(): Promise<SearchReindexResult> {
    const client = await this.pool.connect();
    let lockAcquired = false;

    try {
      lockAcquired = await this.tryLock(client);
      if (!lockAcquired) return { status: 'busy' };

      const startedAt = new Date();
      for (const indexName of SEARCH_TRIGRAM_INDEXES) {
        // Index identifiers are compile-time constants and never originate from a request.
        await client.query(`REINDEX INDEX CONCURRENTLY "public"."${indexName}"`);
      }
      const completedAt = new Date();

      return {
        status: 'completed',
        indexes: [...SEARCH_TRIGRAM_INDEXES],
        startedAt,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
      };
    } finally {
      if (lockAcquired) {
        try {
          await client.query('SELECT pg_advisory_unlock($1, $2)', [
            SEARCH_REINDEX_LOCK_NAMESPACE,
            SEARCH_REINDEX_LOCK_ID,
          ]);
        } catch (error) {
          client.release(error as Error);
          throw error;
        }
      }
      client.release();
    }
  }

  private async tryLock(client: PoolClient): Promise<boolean> {
    const result = await client.query<{ acquired: boolean }>(
      'SELECT pg_try_advisory_lock($1, $2) AS acquired',
      [SEARCH_REINDEX_LOCK_NAMESPACE, SEARCH_REINDEX_LOCK_ID],
    );
    return result.rows[0]?.acquired === true;
  }
}
