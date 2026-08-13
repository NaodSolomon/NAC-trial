import { ConfigService } from '@nestjs/config';
import { Mailer } from '../../mail/mail.interface';
import { DonationReceiptOutboxRepository } from '../interfaces/donation-receipt-outbox-repository.interface';
import { DonationRepository } from '../interfaces/donation-repository.interface';
import { DonationReceiptOutboxService } from './donation-receipt-outbox.service';

describe('DonationReceiptOutboxService', () => {
  let outbox: jest.Mocked<DonationReceiptOutboxRepository>;
  let donations: jest.Mocked<DonationRepository>;
  let mailer: jest.Mocked<Mailer>;
  let service: DonationReceiptOutboxService;

  beforeEach(() => {
    outbox = {
      claimBatch: jest.fn(),
      markSent: jest.fn().mockResolvedValue(true),
      markFailed: jest.fn().mockResolvedValue(true),
    };
    donations = { findById: jest.fn() } as unknown as jest.Mocked<DonationRepository>;
    mailer = { send: jest.fn() };
    service = new DonationReceiptOutboxService(config(), outbox, donations, mailer);
  });

  it('sends a claimed receipt once with a deterministic message identifier', async () => {
    outbox.claimBatch.mockResolvedValue([
      {
        id: '24c1803e-25eb-48d7-9848-3b645698cd25',
        donationId: '40d82a4e-bec4-4586-89b4-b7dcba3b07fc',
        attempts: 1,
        lockToken: 'df63fd32-8bf5-4406-8e4a-73ade58d4507',
      },
    ]);
    donations.findById.mockResolvedValue(confirmedDonation());

    await expect(service.runOnce(new Date('2026-08-13T10:00:00Z'))).resolves.toEqual({
      claimed: 1,
      sent: 1,
      retried: 0,
      failed: 0,
    });
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'donor@example.org',
        messageId: '<donation-receipt-24c1803e-25eb-48d7-9848-3b645698cd25@nehemiah.local>',
      }),
    );
    expect(outbox.markSent).toHaveBeenCalledTimes(1);
  });

  it('backs off transient SMTP failures and stops after the configured attempt limit', async () => {
    const now = new Date('2026-08-13T10:00:00Z');
    outbox.claimBatch.mockResolvedValue([
      {
        id: '24c1803e-25eb-48d7-9848-3b645698cd25',
        donationId: '40d82a4e-bec4-4586-89b4-b7dcba3b07fc',
        attempts: 2,
        lockToken: 'df63fd32-8bf5-4406-8e4a-73ade58d4507',
      },
    ]);
    donations.findById.mockResolvedValue(confirmedDonation());
    mailer.send.mockRejectedValue(new Error('recipient address and SMTP details must not persist'));

    await expect(service.runOnce(now)).resolves.toMatchObject({ retried: 1, failed: 0 });
    expect(outbox.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        terminal: false,
        errorCode: 'MAIL_DELIVERY_FAILED',
        nextAttemptAt: new Date('2026-08-13T10:00:04Z'),
      }),
    );

    outbox.claimBatch.mockResolvedValue([
      {
        id: '24c1803e-25eb-48d7-9848-3b645698cd25',
        donationId: '40d82a4e-bec4-4586-89b4-b7dcba3b07fc',
        attempts: 3,
        lockToken: 'df63fd32-8bf5-4406-8e4a-73ade58d4507',
      },
    ]);
    await expect(service.runOnce(now)).resolves.toMatchObject({ retried: 0, failed: 1 });
    expect(outbox.markFailed).toHaveBeenLastCalledWith(
      expect.objectContaining({ terminal: true, errorCode: 'MAIL_DELIVERY_FAILED' }),
    );
  });

  it('terminally rejects an outbox item whose confirmed receipt no longer exists', async () => {
    outbox.claimBatch.mockResolvedValue([
      {
        id: '24c1803e-25eb-48d7-9848-3b645698cd25',
        donationId: '40d82a4e-bec4-4586-89b4-b7dcba3b07fc',
        attempts: 1,
        lockToken: 'df63fd32-8bf5-4406-8e4a-73ade58d4507',
      },
    ]);
    donations.findById.mockResolvedValue(null);

    await expect(service.runOnce()).resolves.toMatchObject({ failed: 1 });
    expect(mailer.send).not.toHaveBeenCalled();
    expect(outbox.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({ terminal: true, errorCode: 'INVALID_DONATION_RECEIPT' }),
    );
  });
});

function config(): ConfigService {
  const values: Record<string, boolean | number> = {
    'mail.outboxWorkerEnabled': false,
    'mail.outboxWorkerIntervalMs': 5_000,
    'mail.outboxWorkerBatchSize': 10,
    'mail.outboxWorkerMaxAttempts': 3,
    'mail.outboxWorkerBackoffMs': 2_000,
    'mail.outboxWorkerLockTimeoutMs': 30_000,
  };
  return {
    getOrThrow: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function confirmedDonation() {
  return {
    id: '40d82a4e-bec4-4586-89b4-b7dcba3b07fc',
    donorName: 'Receipt Donor',
    donorEmail: 'donor@example.org',
    message: null,
    amount: '25.00',
    currency: 'USD' as const,
    gateway: 'PAYPAL' as const,
    status: 'CONFIRMED' as const,
    providerOrderId: 'ORDER-1',
    externalTransactionId: 'CAPTURE-1',
    receiptUrl: 'http://minio/receipts/receipt.pdf',
    confirmedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
