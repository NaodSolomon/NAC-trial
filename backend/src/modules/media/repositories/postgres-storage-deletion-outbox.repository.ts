import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../../database/drizzle.module';
import {
  StorageDeletionClaim,
  StorageDeletionOutboxRepository,
} from '../interfaces/storage-deletion-outbox-repository.interface';

@Injectable()
export class PostgresStorageDeletionOutboxRepository implements StorageDeletionOutboxRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async claimBatch(criteria: {
    batchSize: number;
    maxAttempts: number;
    now: Date;
    staleBefore: Date;
    lockToken: string;
  }): Promise<StorageDeletionClaim[]> {
    const result = await this.pool.query<{
      id: string;
      object_key: string;
      attempts: number;
      lock_token: string;
    }>(
      `with exhausted as (
         update storage_deletion_outbox
         set status = 'FAILED', processed_at = $2, locked_at = null, lock_token = null,
             last_error = 'LOCK_EXPIRED_AFTER_MAX_ATTEMPTS'
         where status = 'PROCESSING'
           and attempts >= $1
           and (locked_at is null or locked_at <= $3)
       ), candidates as (
         select id
         from storage_deletion_outbox
         where attempts < $1
           and ((status = 'PENDING' and next_attempt_at <= $2)
             or (status = 'PROCESSING' and (locked_at is null or locked_at <= $3)))
         order by next_attempt_at asc, created_at asc
         for update skip locked
         limit $4
       )
       update storage_deletion_outbox as outbox
       set status = 'PROCESSING', attempts = outbox.attempts + 1, locked_at = $2,
           lock_token = $5, last_error = null, processed_at = null
       from candidates
       where outbox.id = candidates.id
       returning outbox.id, outbox.object_key, outbox.attempts, outbox.lock_token`,
      [
        criteria.maxAttempts,
        criteria.now,
        criteria.staleBefore,
        criteria.batchSize,
        criteria.lockToken,
      ],
    );

    return result.rows.map((row) => ({
      id: row.id,
      objectKey: row.object_key,
      attempts: row.attempts,
      lockToken: row.lock_token,
    }));
  }

  async markDeleted(id: string, lockToken: string, processedAt: Date): Promise<boolean> {
    const result = await this.pool.query(
      `update storage_deletion_outbox
       set status = 'SENT', processed_at = $3, locked_at = null, lock_token = null
       where id = $1 and status = 'PROCESSING' and lock_token = $2`,
      [id, lockToken, processedAt],
    );
    return result.rowCount === 1;
  }

  async markFailed(criteria: {
    id: string;
    lockToken: string;
    terminal: boolean;
    nextAttemptAt: Date;
    errorCode: string;
    processedAt: Date;
  }): Promise<boolean> {
    const result = await this.pool.query(
      `update storage_deletion_outbox
       set status = case when $3 then 'FAILED'::outbox_status else 'PENDING'::outbox_status end,
           next_attempt_at = $4::timestamptz, last_error = $5,
           processed_at = case when $3 then $6::timestamptz else null::timestamptz end,
           locked_at = null, lock_token = null
       where id = $1 and status = 'PROCESSING' and lock_token = $2`,
      [
        criteria.id,
        criteria.lockToken,
        criteria.terminal,
        criteria.nextAttemptAt,
        criteria.errorCode,
        criteria.processedAt,
      ],
    );
    return result.rowCount === 1;
  }
}
