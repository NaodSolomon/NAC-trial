import { analyticsEvents } from '../../src/database/schema';
import { DrizzleAnalyticsRepository } from '../../src/modules/analytics/repositories/drizzle-analytics.repository';
import { analyticsEventFactory } from '../factories/analytics-event.factory';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import { connectTestPostgres, PostgresTestContext } from '../helpers/postgres-test.helper';

const describeWithPostgres = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeWithPostgres('DrizzleAnalyticsRepository (PostgreSQL)', () => {
  let context: PostgresTestContext;
  let repository: DrizzleAnalyticsRepository;

  beforeAll(async () => {
    context = await connectTestPostgres();
    repository = new DrizzleAnalyticsRepository(context.db);
  });

  beforeEach(async () => {
    await cleanTestDatabase(context);
  });

  afterAll(async () => {
    await context?.pool.end();
  });

  it('persists and aggregates page views using real PostgreSQL', async () => {
    await repository.record(analyticsEventFactory({ pageUrl: '/donate' }));
    await repository.record(analyticsEventFactory({ pageUrl: '/donate' }));
    await repository.record(analyticsEventFactory({ eventType: 'click', pageUrl: '/donate' }));

    await expect(repository.summary()).resolves.toMatchObject({
      totalVisitors: 2,
      topCountries: [{ country: 'ET', visits: 2 }],
      topPages: [{ route: '/donate', visits: 2 }],
    });
    const persisted = await context.db.select().from(analyticsEvents);
    expect(persisted).toHaveLength(3);
  });
});
