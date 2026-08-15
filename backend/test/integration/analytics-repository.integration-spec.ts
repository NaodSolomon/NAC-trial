import {
  analyticsEvents,
  contactSubmissions,
  donations,
  eventRsvps,
  events,
  newsletterSubscribers,
  resourceDownloadLogs,
  resources,
  volunteerApplications,
} from '../../src/database/schema';
import { DrizzleAnalyticsRepository } from '../../src/modules/analytics/repositories/drizzle-analytics.repository';
import { analyticsEventFactory } from '../factories/analytics-event.factory';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import { connectTestPostgres, PostgresTestContext } from '../helpers/postgres-test.helper';
import { ACTOR_ID, insertTestAdmin } from '../helpers/repository-fixtures.helper';
import { describeWithPostgres } from '../helpers/database-availability.helper';

describeWithPostgres('DrizzleAnalyticsRepository (PostgreSQL)', () => {
  let context: PostgresTestContext;
  let repository: DrizzleAnalyticsRepository;

  beforeAll(async () => {
    context = await connectTestPostgres();
    repository = new DrizzleAnalyticsRepository(context.db);
  });

  beforeEach(async () => {
    await cleanTestDatabase(context);
    await insertTestAdmin(context);
  });

  afterAll(async () => context?.pool.end());

  it('builds the complete cross-feature summary from authoritative PostgreSQL tables', async () => {
    await repository.record(analyticsEventFactory({ pageUrl: '/donate' }));
    await repository.record(analyticsEventFactory({ pageUrl: '/donate' }));
    await repository.record(analyticsEventFactory({ eventType: 'click', pageUrl: '/donate' }));

    await context.db.insert(contactSubmissions).values({
      name: 'Parent',
      email: 'parent@analytics.test',
      message: 'Please contact me.',
    });
    await context.db.insert(volunteerApplications).values({
      name: 'Volunteer',
      email: 'volunteer@analytics.test',
      phone: '+251900000000',
      roleInterest: 'Events',
      message: 'I would like to help.',
    });
    await context.db.insert(newsletterSubscribers).values({ email: 'news@analytics.test' });
    const [event] = await context.db
      .insert(events)
      .values({
        slug: 'analytics-event',
        title: 'Analytics event',
        description: 'Event used by analytics integration tests.',
        startDate: new Date('2026-09-01T10:00:00Z'),
        endDate: new Date('2026-09-01T11:00:00Z'),
        location: 'Addis Ababa',
        rsvpEnabled: true,
        status: 'PUBLISHED',
        createdBy: ACTOR_ID,
      })
      .returning();
    await context.db.insert(eventRsvps).values({
      eventId: event.id,
      name: 'Guest',
      email: 'guest@analytics.test',
      attendees: 2,
    });

    const [resource] = await context.db
      .insert(resources)
      .values({
        title: 'Family guide',
        description: 'Downloadable guide',
        fileUrl: 'http://localhost/guide.pdf',
        fileName: 'guide.pdf',
        mimeType: 'application/pdf',
        status: 'PUBLISHED',
        createdBy: ACTOR_ID,
      })
      .returning();
    await context.db.insert(resourceDownloadLogs).values([
      { resourceId: resource.id, country: 'ET' },
      { resourceId: resource.id, country: 'ET' },
      { resourceId: resource.id, country: null },
    ]);

    const now = new Date();
    await context.db.insert(donations).values([
      {
        donorName: 'Confirmed donor',
        donorEmail: 'confirmed@analytics.test',
        amount: '25.00',
        currency: 'USD',
        gateway: 'SIMULATED',
        status: 'CONFIRMED',
        confirmedAt: now,
      },
      {
        donorName: 'ETB donor',
        donorEmail: 'etb@analytics.test',
        amount: '1500.00',
        currency: 'ETB',
        gateway: 'SIMULATED',
        status: 'CONFIRMED',
        confirmedAt: now,
      },
      {
        donorName: 'Cancelled donor',
        donorEmail: 'cancelled@analytics.test',
        amount: '10.00',
        currency: 'USD',
        gateway: 'SIMULATED',
        status: 'CANCELLED',
      },
    ]);

    await expect(repository.summary()).resolves.toMatchObject({
      totalVisitors: 2,
      topCountries: [{ country: 'ET', visits: 2 }],
      topPages: [{ route: '/donate', visits: 2 }],
      forms: {
        totalSubmissions: 4,
        contact: 1,
        volunteer: 1,
        newsletter: 1,
        eventRsvp: 1,
      },
      resources: {
        totalDownloads: 3,
        topResources: [{ resourceId: resource.id, title: 'Family guide', downloads: 3 }],
        topCountries: [{ country: 'ET', downloads: 2 }],
      },
      donations: {
        totalDonations: 3,
        statusCounts: expect.arrayContaining([
          { status: 'CONFIRMED', count: 2 },
          { status: 'CANCELLED', count: 1 },
          { status: 'FAILED', count: 0 },
        ]),
        confirmedValues: expect.arrayContaining([
          { currency: 'USD', amount: '25.00' },
          { currency: 'ETB', amount: '1500.00' },
        ]),
      },
    });

    const [today] = await repository.timeline(1);
    expect(today).toMatchObject({
      visitors: 2,
      formSubmissions: 4,
      resourceDownloads: 3,
      donationsCreated: 3,
      donationsConfirmed: 2,
      confirmedUsd: '25.00',
      confirmedEtb: '1500.00',
    });
    expect(await context.db.select().from(analyticsEvents)).toHaveLength(3);
  });
});
