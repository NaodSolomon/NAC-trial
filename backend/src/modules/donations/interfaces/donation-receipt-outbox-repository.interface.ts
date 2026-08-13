export const DONATION_RECEIPT_OUTBOX_REPOSITORY = Symbol('DONATION_RECEIPT_OUTBOX_REPOSITORY');

export interface DonationReceiptOutboxClaim {
  id: string;
  donationId: string;
  attempts: number;
  lockToken: string;
}

export interface DonationReceiptOutboxRepository {
  claimBatch(criteria: {
    batchSize: number;
    maxAttempts: number;
    now: Date;
    staleBefore: Date;
    lockToken: string;
  }): Promise<DonationReceiptOutboxClaim[]>;
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
