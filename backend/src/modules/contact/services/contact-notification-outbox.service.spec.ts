import { ConfigService } from '@nestjs/config';
import { Mailer } from '../../mail/mail.interface';
import { ContactNotificationOutboxRepository } from '../interfaces/contact-notification-outbox-repository.interface';
import { ContactRepository } from '../interfaces/contact-repository.interface';
import { ContactNotificationOutboxService } from './contact-notification-outbox.service';

describe('ContactNotificationOutboxService', () => {
  let outbox: jest.Mocked<ContactNotificationOutboxRepository>;
  let contacts: jest.Mocked<ContactRepository>;
  let mailer: jest.Mocked<Mailer>;
  let service: ContactNotificationOutboxService;

  beforeEach(() => {
    outbox = {
      claimBatch: jest.fn(),
      markSent: jest.fn().mockResolvedValue(true),
      markFailed: jest.fn().mockResolvedValue(true),
    };
    contacts = { findById: jest.fn() } as unknown as jest.Mocked<ContactRepository>;
    mailer = { send: jest.fn() };
    service = new ContactNotificationOutboxService(config(), outbox, contacts, mailer);
  });

  it('forwards a claimed submission to the configured center mailbox', async () => {
    outbox.claimBatch.mockResolvedValue([claim(1)]);
    contacts.findById.mockResolvedValue(submission());

    await expect(service.runOnce(new Date('2026-08-14T10:00:00Z'))).resolves.toEqual({
      claimed: 1,
      sent: 1,
      retried: 0,
      failed: 0,
    });
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'center@example.org',
        subject: 'New Nehemiah Autism Center contact submission',
        text: expect.stringContaining('visitor@example.org'),
        messageId: '<contact-submission-24c1803e-25eb-48d7-9848-3b645698cd25@nehemiah.local>',
      }),
    );
    expect(outbox.markSent).toHaveBeenCalledTimes(1);
  });

  it('retains a pending notification with backoff when SMTP is unavailable', async () => {
    const now = new Date('2026-08-14T10:00:00Z');
    outbox.claimBatch.mockResolvedValue([claim(1)]);
    contacts.findById.mockResolvedValue(submission());
    mailer.send.mockRejectedValue(new Error('temporary SMTP outage'));

    await expect(service.runOnce(now)).resolves.toMatchObject({ retried: 1, failed: 0 });
    expect(outbox.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        terminal: false,
        errorCode: 'MAIL_DELIVERY_FAILED',
        nextAttemptAt: new Date('2026-08-14T10:00:02Z'),
      }),
    );
  });

  it('terminally rejects a claim whose authoritative submission no longer exists', async () => {
    outbox.claimBatch.mockResolvedValue([claim(1)]);
    contacts.findById.mockResolvedValue(null);

    await expect(service.runOnce()).resolves.toMatchObject({ failed: 1 });
    expect(mailer.send).not.toHaveBeenCalled();
    expect(outbox.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({ terminal: true, errorCode: 'CONTACT_SUBMISSION_NOT_FOUND' }),
    );
  });
});

function config(): ConfigService {
  const values: Record<string, boolean | number | string> = {
    'mail.contactNotificationEmail': 'center@example.org',
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

function claim(attempts: number) {
  return {
    id: '24c1803e-25eb-48d7-9848-3b645698cd25',
    submissionId: '239fc6d9-31f8-47fd-958d-c3a69b2c9ec7',
    attempts,
    lockToken: 'df63fd32-8bf5-4406-8e4a-73ade58d4507',
  };
}

function submission() {
  return {
    id: '239fc6d9-31f8-47fd-958d-c3a69b2c9ec7',
    name: 'Test Visitor',
    email: 'visitor@example.org',
    subject: 'Services',
    message: 'Please send more information.',
    languageCode: 'en' as const,
    createdAt: new Date('2026-08-14T09:00:00Z'),
  };
}
