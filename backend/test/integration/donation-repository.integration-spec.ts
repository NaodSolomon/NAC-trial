import { eq } from 'drizzle-orm';
import {
  auditLogs,
  donations,
  notificationOutbox,
  paymentWebhookEvents,
} from '../../src/database/schema';
import { DrizzleDonationRepository } from '../../src/modules/donations/repositories/drizzle-donation.repository';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import {
  connectTestPostgres,
  expectPostgresError,
  PostgresTestContext,
} from '../helpers/postgres-test.helper';
import { ACTOR_ID, insertTestAdmin, pageCriteria } from '../helpers/repository-fixtures.helper';

const describeWithPostgres = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeWithPostgres('Donation repository (PostgreSQL)', () => {
  let context: PostgresTestContext;
  let repository: DrizzleDonationRepository;

  beforeAll(async () => {
    context = await connectTestPostgres();
    repository = new DrizzleDonationRepository(context.db);
  });

  beforeEach(async () => {
    await cleanTestDatabase(context);
    await insertTestAdmin(context);
  });

  afterAll(async () => {
    await context?.pool.end();
  });

  it('persists donation state without contacting a payment provider', async () => {
    const donation = await repository.create({
      donorName: 'Trial Donor',
      donorEmail: 'donor@integration.test',
      amount: '50.00',
      currency: 'USD',
      gateway: 'SIMULATED',
      message: 'Integration test donation',
    });
    const pending = await repository.attachOrder(donation.id, 'ORDER-INTEGRATION-1');

    expect(pending).toMatchObject({
      id: donation.id,
      status: 'PENDING',
      providerOrderId: 'ORDER-INTEGRATION-1',
    });
    await expect(
      repository.list({ ...pageCriteria, status: 'PENDING', currency: 'USD' }),
    ).resolves.toMatchObject({
      data: [expect.objectContaining({ id: donation.id })],
      meta: { total: 1 },
    });
  });

  it('enforces provider-order uniqueness', async () => {
    const first = await repository.create({
      donorName: 'First Donor',
      donorEmail: 'first@integration.test',
      amount: '25.00',
      currency: 'USD',
      gateway: 'SIMULATED',
    });
    const second = await repository.create({
      donorName: 'Second Donor',
      donorEmail: 'second@integration.test',
      amount: '30.00',
      currency: 'USD',
      gateway: 'SIMULATED',
    });
    await repository.attachOrder(first.id, 'ORDER-UNIQUE');
    await expectPostgresError(repository.attachOrder(second.id, 'ORDER-UNIQUE'), '23505');
  });

  it('applies each webhook event once and produces confirmed statistics', async () => {
    const donation = await repository.create({
      donorName: 'Webhook Donor',
      donorEmail: 'webhook@integration.test',
      amount: '100.00',
      currency: 'USD',
      gateway: 'SIMULATED',
    });
    await repository.attachOrder(donation.id, 'ORDER-WEBHOOK');
    const webhook = {
      gateway: 'SIMULATED' as const,
      eventId: 'EVENT-INTEGRATION-1',
      eventType: 'PAYMENT.CAPTURE.COMPLETED',
      providerOrderId: 'ORDER-WEBHOOK',
      transactionId: 'CAPTURE-INTEGRATION-1',
      status: 'CONFIRMED' as const,
    };

    await expect(repository.applyWebhook(webhook)).resolves.toBe(true);
    await expect(repository.applyWebhook(webhook)).resolves.toBe(false);
    await expect(repository.findById(donation.id)).resolves.toMatchObject({
      status: 'CONFIRMED',
      externalTransactionId: 'CAPTURE-INTEGRATION-1',
    });
    await expect(repository.stats()).resolves.toEqual({
      totalDonations: 1,
      totals: [{ currency: 'USD', amount: '100.00' }],
    });
    expect(await context.db.select().from(paymentWebhookEvents)).toHaveLength(1);
  });

  it('queues a receipt and its audit record in one transaction', async () => {
    const donation = await repository.create({
      donorName: 'Receipt Donor',
      donorEmail: 'receipt@integration.test',
      amount: '75.00',
      currency: 'ETB',
      gateway: 'PAYPAL',
    });
    await repository.enqueueReceipt(donation.id, ACTOR_ID);

    await expect(context.db.select().from(notificationOutbox)).resolves.toEqual([
      expect.objectContaining({
        type: 'DONATION_RECEIPT_EMAIL',
        payload: { donationId: donation.id },
      }),
    ]);
    const [audit] = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, donation.id));
    expect(audit).toMatchObject({ action: 'ENQUEUE_RECEIPT', adminId: ACTOR_ID });
  });

  it('manually verifies an eligible donation and audits the transition', async () => {
    const donation = await repository.create({
      donorName: 'Verified Donor',
      donorEmail: 'verified@integration.test',
      amount: '125.00',
      currency: 'ETB',
      gateway: 'PAYPAL',
    });
    await expect(repository.verify(donation.id, ACTOR_ID)).resolves.toMatchObject({
      status: 'CONFIRMED',
    });
    const [persisted] = await context.db
      .select()
      .from(donations)
      .where(eq(donations.id, donation.id));
    expect(persisted.confirmedAt).toBeInstanceOf(Date);
  });
});
