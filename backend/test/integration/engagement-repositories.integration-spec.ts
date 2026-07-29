import { eq } from 'drizzle-orm';
import { auditLogs } from '../../src/database/schema';
import { DrizzleContactRepository } from '../../src/modules/contact/repositories/drizzle-contact.repository';
import { DrizzleEngagementRepository } from '../../src/modules/engagement/repositories/drizzle-engagement.repository';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import {
  connectTestPostgres,
  expectPostgresError,
  PostgresTestContext,
} from '../helpers/postgres-test.helper';
import { ACTOR_ID, insertTestAdmin, pageCriteria } from '../helpers/repository-fixtures.helper';

const describeWithPostgres = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeWithPostgres('Contact and engagement repositories (PostgreSQL)', () => {
  let context: PostgresTestContext;
  let contactRepository: DrizzleContactRepository;
  let engagementRepository: DrizzleEngagementRepository;

  beforeAll(async () => {
    context = await connectTestPostgres();
    contactRepository = new DrizzleContactRepository(context.db);
    engagementRepository = new DrizzleEngagementRepository(context.db);
  });

  beforeEach(async () => {
    await cleanTestDatabase(context);
    await insertTestAdmin(context);
  });

  afterAll(async () => {
    await context?.pool.end();
  });

  it('persists, searches, and transactionally deletes contact submissions', async () => {
    const submission = await contactRepository.create({
      name: 'Test Visitor',
      email: 'visitor@integration.test',
      subject: 'Volunteer support',
      message: 'I would like more information.',
      languageCode: 'en',
    });

    await expect(
      contactRepository.list({ ...pageCriteria, search: 'volunteer', languageCode: 'en' }),
    ).resolves.toMatchObject({
      data: [expect.objectContaining({ id: submission.id })],
      meta: { total: 1 },
    });
    await expect(contactRepository.delete(submission.id, ACTOR_ID)).resolves.toBe(true);
    const [audit] = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, submission.id));
    expect(audit).toMatchObject({
      action: 'DELETE',
      entityType: 'CONTACT_SUBMISSION',
      metadata: expect.not.objectContaining({
        email: expect.anything(),
        name: expect.anything(),
        message: expect.anything(),
      }),
    });
  });

  it('persists and filters volunteer applications', async () => {
    const application = await engagementRepository.createApplication({
      name: 'Volunteer Applicant',
      email: 'volunteer@integration.test',
      phone: '+251900000001',
      roleInterest: 'Event support',
      message: 'I can support weekend events.',
      languageCode: 'en',
    });
    await expect(
      engagementRepository.listApplications({
        ...pageCriteria,
        status: 'PENDING',
        search: 'event',
      }),
    ).resolves.toMatchObject({
      data: [expect.objectContaining({ id: application.id })],
      meta: { total: 1 },
    });
  });

  it('keeps draft testimonials private and exposes published entries', async () => {
    const draft = await engagementRepository.createTestimonial(
      {
        name: 'Parent',
        text: 'A helpful center.',
        languageCode: 'en',
        status: 'DRAFT',
        createdBy: ACTOR_ID,
      },
      ACTOR_ID,
    );
    await expect(
      engagementRepository.listTestimonials({ ...pageCriteria, languageCode: 'en' }, true),
    ).resolves.toMatchObject({ data: [], meta: { total: 0 } });

    await engagementRepository.updateTestimonial(draft.id, { status: 'PUBLISHED' }, ACTOR_ID);
    await expect(
      engagementRepository.listTestimonials({ ...pageCriteria, languageCode: 'en' }, true),
    ).resolves.toMatchObject({
      data: [expect.objectContaining({ id: draft.id, status: 'PUBLISHED' })],
    });
  });

  it('enforces newsletter email uniqueness and lists subscribers', async () => {
    await engagementRepository.createSubscriber({
      email: 'subscriber@integration.test',
      languageCode: 'en',
    });
    await expectPostgresError(
      engagementRepository.createSubscriber({
        email: 'subscriber@integration.test',
        languageCode: 'am',
      }),
      '23505',
    );
    await expect(engagementRepository.listSubscribers(pageCriteria)).resolves.toMatchObject({
      meta: { total: 1 },
    });
  });
});
