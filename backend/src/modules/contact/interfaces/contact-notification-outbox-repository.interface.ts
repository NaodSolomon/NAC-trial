export const CONTACT_NOTIFICATION_OUTBOX_REPOSITORY = Symbol(
  'CONTACT_NOTIFICATION_OUTBOX_REPOSITORY',
);

export interface ContactNotificationOutboxClaim {
  id: string;
  submissionId: string;
  attempts: number;
  lockToken: string;
}

export interface ContactNotificationOutboxRepository {
  claimBatch(criteria: {
    batchSize: number;
    maxAttempts: number;
    now: Date;
    staleBefore: Date;
    lockToken: string;
  }): Promise<ContactNotificationOutboxClaim[]>;
  markSent(id: string, lockToken: string, processedAt: Date): Promise<boolean>;
  markFailed(criteria: {
    id: string;
    lockToken: string;
    terminal: boolean;
    nextAttemptAt: Date;
    errorCode: string;
    processedAt: Date;
  }): Promise<boolean>;
}
