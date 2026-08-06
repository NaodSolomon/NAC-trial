import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../../../database/drizzle.module';
import {
  ScheduledPublishingLock,
  ScheduledPublishingLockResult,
} from '../interfaces/scheduled-publishing-lock.interface';

const SCHEDULED_PUBLISHING_LOCK_NAMESPACE = 50_325;
const SCHEDULED_PUBLISHING_LOCK_ID = 5;

@Injectable()
export class PostgresScheduledPublishingLock implements ScheduledPublishingLock {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async runExclusive<T>(operation: () => Promise<T>): Promise<ScheduledPublishingLockResult<T>> {
    const client = await this.pool.connect();
    let lockAcquired = false;

    try {
      lockAcquired = await this.tryLock(client);
      if (!lockAcquired) return { acquired: false };

      return { acquired: true, value: await operation() };
    } finally {
      if (lockAcquired) {
        try {
          await client.query('SELECT pg_advisory_unlock($1, $2)', [
            SCHEDULED_PUBLISHING_LOCK_NAMESPACE,
            SCHEDULED_PUBLISHING_LOCK_ID,
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
      [SCHEDULED_PUBLISHING_LOCK_NAMESPACE, SCHEDULED_PUBLISHING_LOCK_ID],
    );
    return result.rows[0]?.acquired === true;
  }
}
