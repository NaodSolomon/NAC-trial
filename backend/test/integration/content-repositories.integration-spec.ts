import { eq } from 'drizzle-orm';
import { auditLogs, cmsPages, siteSettings } from '../../src/database/schema';
import { DrizzleCmsPageRepository } from '../../src/modules/cms/repositories/drizzle-cms-page.repository';
import { DrizzleNavigationRepository } from '../../src/modules/navigation/repositories/drizzle-navigation.repository';
import { DrizzleSiteSettingsRepository } from '../../src/modules/settings/repositories/drizzle-site-settings.repository';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import {
  connectTestPostgres,
  expectPostgresError,
  PostgresTestContext,
} from '../helpers/postgres-test.helper';
import { ACTOR_ID, insertTestAdmin, pageCriteria } from '../helpers/repository-fixtures.helper';
import { describeWithPostgres } from '../helpers/database-availability.helper';

describeWithPostgres('CMS, navigation, and settings repositories (PostgreSQL)', () => {
  let context: PostgresTestContext;
  let cmsRepository: DrizzleCmsPageRepository;
  let navigationRepository: DrizzleNavigationRepository;
  let settingsRepository: DrizzleSiteSettingsRepository;

  beforeAll(async () => {
    context = await connectTestPostgres();
    cmsRepository = new DrizzleCmsPageRepository(context.db);
    navigationRepository = new DrizzleNavigationRepository(context.db);
    settingsRepository = new DrizzleSiteSettingsRepository(context.db);
  });

  beforeEach(async () => {
    await cleanTestDatabase(context);
    await insertTestAdmin(context);
  });

  afterAll(async () => {
    await context?.pool.end();
  });

  it('creates, publishes, reads, and audits a localized CMS page', async () => {
    const page = await cmsRepository.create(
      {
        slug: 'about',
        languageCode: 'en',
        title: 'About',
        content: 'Published content',
        createdBy: ACTOR_ID,
      },
      ACTOR_ID,
    );
    expect(await cmsRepository.isSlugAvailable('about', 'en')).toBe(false);
    expect(await cmsRepository.findPublished('about', 'en')).toBeNull();

    await cmsRepository.publish(page.id, ACTOR_ID);
    await expect(cmsRepository.findPublished('about', 'en')).resolves.toMatchObject({
      id: page.id,
      status: 'PUBLISHED',
    });
    await expect(
      cmsRepository.list({ ...pageCriteria, languageCode: 'en', status: 'PUBLISHED' }),
    ).resolves.toMatchObject({ meta: { total: 1 } });

    const pageAudit = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, page.id));
    expect(pageAudit.map((entry) => entry.action)).toEqual(['CREATE', 'PUBLISH']);
  });

  it('publishes only scheduled pages whose due time has passed', async () => {
    const due = await cmsRepository.create(
      {
        slug: 'due',
        languageCode: 'en',
        title: 'Due',
        content: 'Due content',
        createdBy: ACTOR_ID,
      },
      ACTOR_ID,
    );
    const future = await cmsRepository.create(
      {
        slug: 'future',
        languageCode: 'en',
        title: 'Future',
        content: 'Future content',
        createdBy: ACTOR_ID,
      },
      ACTOR_ID,
    );
    const now = new Date('2026-02-01T12:00:00.000Z');
    await cmsRepository.schedule(due.id, new Date('2026-02-01T11:00:00.000Z'), ACTOR_ID);
    await cmsRepository.schedule(future.id, new Date('2026-02-02T11:00:00.000Z'), ACTOR_ID);

    await expect(cmsRepository.publishScheduled(now)).resolves.toBe(1);
    expect((await cmsRepository.findById(due.id))?.status).toBe('PUBLISHED');
    expect((await cmsRepository.findById(future.id))?.status).toBe('SCHEDULED');
  });

  it('enforces localized slug and translation uniqueness', async () => {
    const translationKey = '8596c7dc-8167-4619-b902-9f683f6d90d0';
    await context.db.insert(cmsPages).values({
      translationKey,
      slug: 'services',
      languageCode: 'en',
      title: 'Services',
      content: 'English',
      createdBy: ACTOR_ID,
    });

    await expectPostgresError(
      context.db.insert(cmsPages).values({
        slug: 'services',
        languageCode: 'en',
        title: 'Duplicate slug',
        content: 'Duplicate',
        createdBy: ACTOR_ID,
      }),
      '23505',
    );
    await expectPostgresError(
      context.db.insert(cmsPages).values({
        translationKey,
        slug: 'different',
        languageCode: 'en',
        title: 'Duplicate translation',
        content: 'Duplicate',
        createdBy: ACTOR_ID,
      }),
      '23505',
    );
  });

  it('filters public navigation and audits mutations', async () => {
    const visible = await navigationRepository.create(
      {
        label: 'About',
        url: '/about',
        order: 1,
        languageCode: 'en',
        isVisible: true,
        createdBy: ACTOR_ID,
      },
      ACTOR_ID,
    );
    await navigationRepository.create(
      {
        label: 'Draft',
        url: '/draft',
        order: 2,
        languageCode: 'en',
        isVisible: false,
        createdBy: ACTOR_ID,
      },
      ACTOR_ID,
    );

    await expect(navigationRepository.publicList('en')).resolves.toEqual([
      expect.objectContaining({ id: visible.id }),
    ]);
    await expect(
      navigationRepository.list({ ...pageCriteria, languageCode: 'en' }),
    ).resolves.toMatchObject({ meta: { total: 2 } });
  });

  it('updates the singleton site settings and writes its audit record', async () => {
    await context.db.insert(siteSettings).values({
      key: 'global',
      siteName: 'Nehemiah Autism Center',
      updatedBy: ACTOR_ID,
    });
    await expect(
      settingsRepository.update(
        {
          contactEmail: 'info@integration.test',
          socialLinks: { facebook: 'https://facebook.com/nehemiah-integration' },
        },
        ACTOR_ID,
      ),
    ).resolves.toMatchObject({
      contactEmail: 'info@integration.test',
      socialLinks: { facebook: 'https://facebook.com/nehemiah-integration' },
      updatedBy: ACTOR_ID,
    });
    await expect(settingsRepository.get()).resolves.toMatchObject({
      key: 'global',
      contactEmail: 'info@integration.test',
      socialLinks: { facebook: 'https://facebook.com/nehemiah-integration' },
    });
    const [audit] = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityType, 'SITE_SETTINGS'));
    expect(audit).toMatchObject({ action: 'UPDATE', adminId: ACTOR_ID });
  });
});
