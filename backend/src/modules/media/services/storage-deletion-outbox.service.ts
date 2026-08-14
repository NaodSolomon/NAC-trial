import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { OBJECT_STORAGE, ObjectStorage } from '../interfaces/object-storage.interface';
import {
  STORAGE_DELETION_OUTBOX_REPOSITORY,
  StorageDeletionClaim,
  StorageDeletionOutboxRepository,
} from '../interfaces/storage-deletion-outbox-repository.interface';

export interface StorageDeletionRunResult {
  claimed: number;
  deleted: number;
  retried: number;
  failed: number;
}

@Injectable()
export class StorageDeletionOutboxService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(StorageDeletionOutboxService.name);
  private timer?: NodeJS.Timeout;
  private activeTick?: Promise<void>;

  constructor(
    private readonly config: ConfigService,
    @Inject(STORAGE_DELETION_OUTBOX_REPOSITORY)
    private readonly outbox: StorageDeletionOutboxRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.getOrThrow<boolean>('storage.deletionWorkerEnabled')) return;

    const intervalMs = this.config.getOrThrow<number>('storage.deletionWorkerIntervalMs');
    this.startTick();
    this.timer = setInterval(() => this.startTick(), intervalMs);
    this.timer.unref();
    this.logger.log(`Storage deletion outbox worker enabled with a ${intervalMs} ms interval`);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.activeTick;
  }

  async runOnce(now = new Date()): Promise<StorageDeletionRunResult> {
    const maxAttempts = this.config.getOrThrow<number>('storage.deletionWorkerMaxAttempts');
    const lockTimeoutMs = this.config.getOrThrow<number>('storage.deletionWorkerLockTimeoutMs');
    const claims = await this.outbox.claimBatch({
      batchSize: this.config.getOrThrow<number>('storage.deletionWorkerBatchSize'),
      maxAttempts,
      now,
      staleBefore: new Date(now.getTime() - lockTimeoutMs),
      lockToken: randomUUID(),
    });
    const result: StorageDeletionRunResult = {
      claimed: claims.length,
      deleted: 0,
      retried: 0,
      failed: 0,
    };

    for (const claim of claims) await this.deleteObject(claim, now, maxAttempts, result);
    return result;
  }

  private async deleteObject(
    claim: StorageDeletionClaim,
    now: Date,
    maxAttempts: number,
    result: StorageDeletionRunResult,
  ): Promise<void> {
    try {
      await this.storage.delete(claim.objectKey);
      if (await this.outbox.markDeleted(claim.id, claim.lockToken, new Date())) {
        result.deleted += 1;
      } else {
        this.logger.warn(`Storage deletion claim ${claim.id} lost its lock after object deletion`);
      }
    } catch {
      const terminal = claim.attempts >= maxAttempts;
      const backoffMs = this.config.getOrThrow<number>('storage.deletionWorkerBackoffMs');
      const delayMs = backoffMs * 2 ** Math.max(0, claim.attempts - 1);
      const updated = await this.outbox.markFailed({
        id: claim.id,
        lockToken: claim.lockToken,
        terminal,
        nextAttemptAt: terminal ? now : new Date(now.getTime() + delayMs),
        errorCode: 'OBJECT_DELETION_FAILED',
        processedAt: new Date(),
      });
      if (!updated) {
        this.logger.warn(`Storage deletion claim ${claim.id} lost its lock after failure`);
      } else if (terminal) {
        result.failed += 1;
      } else {
        result.retried += 1;
      }
    }
  }

  private startTick(): void {
    if (this.activeTick) return;
    this.activeTick = this.runOnce()
      .then((result) => {
        if (result.claimed > 0) {
          this.logger.log(
            `Storage deletion outbox processed ${result.claimed} item(s): ${result.deleted} deleted, ${result.retried} retrying, ${result.failed} failed`,
          );
        }
      })
      .catch(() => this.logger.error('Storage deletion outbox tick failed'))
      .finally(() => {
        this.activeTick = undefined;
      });
  }
}
