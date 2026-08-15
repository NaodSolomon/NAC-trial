import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { donations, notificationOutbox } from '../../src/database/schema';
import { MailpitMailerService } from '../../src/modules/mail/mailpit-mailer.service';
import { DrizzleDonationRepository } from '../../src/modules/donations/repositories/drizzle-donation.repository';
import { PostgresDonationReceiptOutboxRepository } from '../../src/modules/donations/repositories/postgres-donation-receipt-outbox.repository';
import { DonationReceiptOutboxService } from '../../src/modules/donations/services/donation-receipt-outbox.service';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import { clearMailpitMailbox, waitForMailpitText } from '../helpers/mailpit-test.helper';
import { connectTestPostgres, PostgresTestContext } from '../helpers/postgres-test.helper';
import { ACTOR_ID, insertTestAdmin } from '../helpers/repository-fixtures.helper';

const describeWithServices =
  process.env.TEST_DATABASE_URL && process.env.TEST_MAIL_HOST ? describe : describe.skip;

describeWithServices('Donation receipt outbox delivery (PostgreSQL and Mailpit)', () => {
  let context: PostgresTestContext;
  let donationsRepository: DrizzleDonationRepository;
  let outboxRepository: PostgresDonationReceiptOutboxRepository;
  let service: DonationReceiptOutboxService;

  beforeAll(async () => {
    context = await connectTestPostgres();
    donationsRepository = new DrizzleDonationRepository(context.db);
    outboxRepository = new PostgresDonationReceiptOutboxRepository(context.pool);
    service = new DonationReceiptOutboxService(
      workerConfig(),
      outboxRepository,
      donationsRepository,
      new MailpitMailerService(mailpitConfig()),
    );
  });

  beforeEach(async () => {
    await cleanTestDatabase(context);
    await insertTestAdmin(context);
    await clearMailpitMailbox();
  });

  afterAll(async () => context?.pool.end());

  it('claims concurrently once, delivers to Mailpit, and never resends a SENT item', async () => {
    const [donation] = await context.db
      .insert(donations)
      .values({
        donorName: 'Mailpit Donor',
        donorEmail: 'outbox@integration.test',
        amount: '75.00',
        currency: 'ETB',
        gateway: 'SIMULATED',
        status: 'CONFIRMED',
        receiptUrl: 'http://minio/receipts/integration.pdf',
        confirmedAt: new Date(),
      })
      .returning();
    await donationsRepository.enqueueReceipt(donation.id, ACTOR_ID);

    const now = new Date();
    const [firstClaims, competingClaims] = await Promise.all([
      outboxRepository.claimBatch({
        batchSize: 10,
        maxAttempts: 3,
        now,
        staleBefore: new Date(now.getTime() - 30_000),
        lockToken: '7ea1e814-1970-4e18-95fb-dcf9095c765b',
      }),
      outboxRepository.claimBatch({
        batchSize: 10,
        maxAttempts: 3,
        now,
        staleBefore: new Date(now.getTime() - 30_000),
        lockToken: 'ada4cf75-e2b0-476e-85a4-44b631f8c002',
      }),
    ]);
    expect(firstClaims.length + competingClaims.length).toBe(1);

    // Release the one test claim as an immediately due retry, then exercise the worker.
    const [claim] = [...firstClaims, ...competingClaims];
    await outboxRepository.markFailed({
      id: claim.id,
      lockToken: claim.lockToken,
      terminal: false,
      nextAttemptAt: now,
      errorCode: 'TEST_RELEASE',
      processedAt: now,
    });

    await expect(service.runOnce(new Date(now.getTime() + 1))).resolves.toMatchObject({ sent: 1 });
    expect(await waitForMailpitText('Receipt:')).toContain('/receipts/integration.pdf');
    await expect(service.runOnce(new Date(now.getTime() + 2))).resolves.toMatchObject({
      claimed: 0,
      sent: 0,
    });

    const [outbox] = await context.db
      .select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.payload, { donationId: donation.id }));
    expect(outbox).toMatchObject({ status: 'SENT', attempts: 2, lastError: null });
    expect(outbox.processedAt).toBeInstanceOf(Date);
  });

  it('terminally closes an expired lock after the maximum attempt', async () => {
    const donationId = '40d82a4e-bec4-4586-89b4-b7dcba3b07fc';
    await context.db.insert(notificationOutbox).values({
      type: 'DONATION_RECEIPT_EMAIL',
      payload: { donationId },
      status: 'PROCESSING',
      attempts: 3,
      lockedAt: new Date('2026-08-13T09:00:00Z'),
      lockToken: '7ea1e814-1970-4e18-95fb-dcf9095c765b',
    });

    await expect(
      outboxRepository.claimBatch({
        batchSize: 10,
        maxAttempts: 3,
        now: new Date('2026-08-13T10:00:00Z'),
        staleBefore: new Date('2026-08-13T09:59:30Z'),
        lockToken: 'ada4cf75-e2b0-476e-85a4-44b631f8c002',
      }),
    ).resolves.toEqual([]);

    const [outbox] = await context.db.select().from(notificationOutbox);
    expect(outbox).toMatchObject({
      status: 'FAILED',
      attempts: 3,
      lastError: 'LOCK_EXPIRED_AFTER_MAX_ATTEMPTS',
      lockToken: null,
      lockedAt: null,
    });
  });
});

function workerConfig(): ConfigService {
  const values: Record<string, boolean | number> = {
    'mail.outboxWorkerEnabled': false,
    'mail.outboxWorkerIntervalMs': 5_000,
    'mail.outboxWorkerBatchSize': 10,
    'mail.outboxWorkerMaxAttempts': 3,
    'mail.outboxWorkerBackoffMs': 1_000,
    'mail.outboxWorkerLockTimeoutMs': 30_000,
  };
  return { getOrThrow: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

function mailpitConfig(): ConfigService {
  const values: Record<string, string | number> = {
    'mail.host': process.env.TEST_MAIL_HOST ?? '127.0.0.1',
    'mail.port': Number(process.env.TEST_MAIL_PORT ?? 1026),
    'mail.from': 'noreply@nehemiah.local',
    'mail.connectionTimeoutMs': 3_000,
    'mail.greetingTimeoutMs': 3_000,
    'mail.socketTimeoutMs': 10_000,
  };
  return { getOrThrow: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}
