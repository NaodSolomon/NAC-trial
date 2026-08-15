import { and, eq } from 'drizzle-orm';
import { auditLogs, cmsPages } from '../../src/database/schema';
import { DrizzleSeoRepository } from '../../src/modules/seo/repositories/drizzle-seo.repository';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import {
  connectTestPostgres,
  expectPostgresError,
  PostgresTestContext,
} from '../helpers/postgres-test.helper';
import { ACTOR_ID, insertTestAdmin } from '../helpers/repository-fixtures.helper';
import { describeWithPostgres } from '../helpers/database-availability.helper';

describeWithPostgres('SEO repository (PostgreSQL)', () => {
  let context: PostgresTestContext;
  let repository: DrizzleSeoRepository;

  beforeAll(async () => {
    context = await connectTestPostgres();
    repository = new DrizzleSeoRepository(context.db);
  });

  beforeEach(async () => {
    await cleanTestDatabase(context);
    await insertTestAdmin(context);
    await context.db.insert(cmsPages).values([
      {
        slug: 'services',
        languageCode: 'en',
        title: 'Services fallback',
        content: 'English published content must not enter the SEO response.',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        seoDescription: 'English description',
        seoKeywords: ['autism', 'therapy'],
        createdBy: ACTOR_ID,
      },
      {
        slug: 'services',
        languageCode: 'am',
        title: 'የአገልግሎት ርዕስ',
        content: 'Amharic content',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        seoTitle: 'የኦቲዝም አገልግሎቶች',
        seoKeywords: ['ኦቲዝም'],
        createdBy: ACTOR_ID,
      },
      {
        slug: 'private-program',
        languageCode: 'en',
        title: 'Private program',
        content: 'Draft content',
        status: 'DRAFT',
        seoTitle: 'Draft SEO title',
        createdBy: ACTOR_ID,
      },
    ]);
  });

  afterAll(async () => {
    await context?.pool.end();
  });

  it('selects only published SEO fields and keeps language variants separate', async () => {
    await expect(repository.findPublished('services', 'en')).resolves.toMatchObject({
      slug: 'services',
      languageCode: 'en',
      pageTitle: 'Services fallback',
      seoTitle: null,
      seoDescription: 'English description',
      seoKeywords: ['autism', 'therapy'],
    });
    await expect(repository.findPublished('services', 'am')).resolves.toMatchObject({
      languageCode: 'am',
      seoTitle: 'የኦቲዝም አገልግሎቶች',
      seoKeywords: ['ኦቲዝም'],
    });
    await expect(repository.findPublished('private-program', 'en')).resolves.toBeNull();
    expect(JSON.stringify(await repository.findPublished('services', 'en'))).not.toContain(
      'English published content',
    );
  });

  it('updates one language without changing publication state and inserts an audit event', async () => {
    const updated = await repository.update(
      'services',
      'en',
      {
        seoTitle: 'Autism Awareness Ethiopia',
        seoDescription: 'Nehemiah Autism Center services and programs.',
        seoKeywords: ['autism', 'ethiopia', 'therapy'],
        seoImageUrl: 'https://cdn.example.org/seo/services.jpg',
      },
      ACTOR_ID,
    );

    expect(updated).toMatchObject({
      seoTitle: 'Autism Awareness Ethiopia',
      seoKeywords: ['autism', 'ethiopia', 'therapy'],
    });
    const [page] = await context.db
      .select()
      .from(cmsPages)
      .where(and(eq(cmsPages.slug, 'services'), eq(cmsPages.languageCode, 'en')));
    expect(page.status).toBe('PUBLISHED');
    const [amharic] = await context.db
      .select()
      .from(cmsPages)
      .where(and(eq(cmsPages.slug, 'services'), eq(cmsPages.languageCode, 'am')));
    expect(amharic.seoTitle).toBe('የኦቲዝም አገልግሎቶች');

    const [audit] = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'UPDATE_SEO'));
    expect(audit).toMatchObject({
      adminId: ACTOR_ID,
      entityType: 'CMS_PAGE',
      entityId: page.id,
      metadata: {
        slug: 'services',
        languageCode: 'en',
        changedFields: ['seoTitle', 'seoDescription', 'seoKeywords', 'seoImageUrl'],
      },
    });
  });

  it('rolls back metadata changes when the audit insert fails', async () => {
    await expectPostgresError(
      repository.update(
        'services',
        'en',
        { seoTitle: 'Must be rolled back' },
        '00000000-0000-4000-8000-000000000099',
      ),
      '23503',
    );

    const [page] = await context.db
      .select()
      .from(cmsPages)
      .where(and(eq(cmsPages.slug, 'services'), eq(cmsPages.languageCode, 'en')));
    expect(page.seoTitle).toBeNull();
    const audits = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'UPDATE_SEO'));
    expect(audits).toHaveLength(0);
  });
});
