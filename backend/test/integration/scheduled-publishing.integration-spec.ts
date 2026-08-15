import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { auditLogs } from '../../src/database/schema';
import { DrizzleCmsPageRepository } from '../../src/modules/cms/repositories/drizzle-cms-page.repository';
import { PostgresScheduledPublishingLock } from '../../src/modules/cms/repositories/postgres-scheduled-publishing-lock.repository';
import { CmsPagesService } from '../../src/modules/cms/services/cms-pages.service';
import { ScheduledPublishingService } from '../../src/modules/cms/services/scheduled-publishing.service';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import { connectTestPostgres, PostgresTestContext } from '../helpers/postgres-test.helper';
import { ACTOR_ID, insertTestAdmin } from '../helpers/repository-fixtures.helper';
import { describeWithPostgres } from '../helpers/database-availability.helper';

describeWithPostgres('scheduled CMS publishing (PostgreSQL)', () => {
  let context: PostgresTestContext;
  let repository: DrizzleCmsPageRepository;
  let scheduler: ScheduledPublishingService;

  beforeAll(async () => {
    context = await connectTestPostgres();
    repository = new DrizzleCmsPageRepository(context.db);
    scheduler = new ScheduledPublishingService(
      new ConfigService({
        app: { scheduledPublishingEnabled: false, scheduledPublishingIntervalMs: 60_000 },
      }),
      new PostgresScheduledPublishingLock(context.pool),
      new CmsPagesService(repository),
    );
  });

  beforeEach(async () => {
    await cleanTestDatabase(context);
    await insertTestAdmin(context);
  });

  afterAll(async () => {
    await context?.pool.end();
  });

  it('publishes due content and writes its audit event while holding the advisory lock', async () => {
    const page = await repository.create(
      {
        slug: 'automatic-publication',
        languageCode: 'en',
        title: 'Automatic publication',
        content: 'Scheduled content',
        createdBy: ACTOR_ID,
      },
      ACTOR_ID,
    );
    await repository.schedule(page.id, new Date(Date.now() - 60_000), ACTOR_ID);

    await expect(scheduler.runOnce()).resolves.toEqual({ status: 'completed', processed: 1 });
    await expect(repository.findById(page.id)).resolves.toMatchObject({ status: 'PUBLISHED' });

    const automaticAudit = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, page.id));
    expect(automaticAudit.map(({ action }) => action)).toContain('AUTO_PUBLISH');
  });

  it('skips safely when another worker owns the publishing lock', async () => {
    const lockClient = await context.pool.connect();
    try {
      await lockClient.query('SELECT pg_advisory_lock($1, $2)', [50_325, 5]);
      await expect(scheduler.runOnce()).resolves.toEqual({ status: 'busy', processed: 0 });
    } finally {
      await lockClient.query('SELECT pg_advisory_unlock($1, $2)', [50_325, 5]);
      lockClient.release();
    }
  });
});
