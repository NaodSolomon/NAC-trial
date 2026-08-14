export const STORAGE_DELETION_OUTBOX_REPOSITORY = Symbol('STORAGE_DELETION_OUTBOX_REPOSITORY');

export interface StorageDeletionClaim {
  id: string;
  objectKey: string;
  attempts: number;
  lockToken: string;
}

export interface StorageDeletionOutboxRepository {
  claimBatch(criteria: {
    batchSize: number;
    maxAttempts: number;
    now: Date;
    staleBefore: Date;
    lockToken: string;
  }): Promise<StorageDeletionClaim[]>;
  markDeleted(id: string, lockToken: string, processedAt: Date): Promise<boolean>;
  markFailed(criteria: {
    id: string;
    lockToken: string;
    terminal: boolean;
    nextAttemptAt: Date;
    errorCode: string;
    processedAt: Date;
  }): Promise<boolean>;
}
