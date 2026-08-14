import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { notificationOutbox } from '../../src/database/schema';
import { DrizzleContactRepository } from '../../src/modules/contact/repositories/drizzle-contact.repository';
import { PostgresContactNotificationOutboxRepository } from '../../src/modules/contact/repositories/postgres-contact-notification-outbox.repository';
import { ContactNotificationOutboxService } from '../../src/modules/contact/services/contact-notification-outbox.service';
import { MailpitMailerService } from '../../src/modules/mail/mailpit-mailer.service';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import { clearMailpitMailbox, waitForMailpitText } from '../helpers/mailpit-test.helper';
import { connectTestPostgres, PostgresTestContext } from '../helpers/postgres-test.helper';

const describeWithServices =
  process.env.TEST_DATABASE_URL && process.env.TEST_MAIL_HOST ? describe : describe.skip;

describeWithServices('Contact notification outbox delivery (PostgreSQL and Mailpit)', () => {
  let context: PostgresTestContext;
  let contacts: DrizzleContactRepository;
  let outbox: PostgresContactNotificationOutboxRepository;
  let service: ContactNotificationOutboxService;

  beforeAll(async () => {
    context = await connectTestPostgres();
    contacts = new DrizzleContactRepository(context.db);
    outbox = new PostgresContactNotificationOutboxRepository(context.pool);
    service = new ContactNotificationOutboxService(
      workerConfig(),
      outbox,
      contacts,
      new MailpitMailerService(mailpitConfig()),
    );
  });

  beforeEach(async () => {
    await cleanTestDatabase(context);
    await clearMailpitMailbox();
  });

  afterAll(async () => context?.pool.end());

  it('persists first, forwards to the configured mailbox, and delivers only once', async () => {
    const submission = await contacts.create({
      name: 'Mailpit Visitor',
      email: 'visitor@integration.test',
      subject: 'Family services',
      message: 'Please send information about available services.',
      languageCode: 'en',
    });

    // Persistence succeeds before any SMTP attempt; the worker owns delivery and retry behavior.
    await expect(contacts.findById(submission.id)).resolves.toMatchObject({ id: submission.id });
    await expect(service.runOnce()).resolves.toMatchObject({ claimed: 1, sent: 1 });
    expect(await waitForMailpitText('Please send information')).toContain(
      'visitor@integration.test',
    );
    await expect(service.runOnce()).resolves.toMatchObject({ claimed: 0, sent: 0 });

    const [notification] = await context.db
      .select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.type, 'CONTACT_SUBMISSION_EMAIL'));
    expect(notification).toMatchObject({
      status: 'SENT',
      attempts: 1,
      payload: { submissionId: submission.id },
      lastError: null,
    });
  });
});

function workerConfig(): ConfigService {
  const values: Record<string, boolean | number | string> = {
    'mail.contactNotificationEmail': 'center@integration.test',
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
