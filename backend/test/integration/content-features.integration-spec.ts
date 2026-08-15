import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import {
  auditLogs,
  blogPosts,
  cmsPages,
  events,
  resourceDownloadLogs,
  resources,
} from '../../src/database/schema';
import { DrizzleBlogRepository } from '../../src/modules/blog/repositories/drizzle-blog.repository';
import { DrizzleResourceRepository } from '../../src/modules/resources/repositories/drizzle-resource.repository';
import { SearchService } from '../../src/modules/search/search.service';
import { DrizzleSearchRepository } from '../../src/modules/search/repositories/drizzle-search.repository';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import {
  connectTestPostgres,
  expectPostgresError,
  PostgresTestContext,
} from '../helpers/postgres-test.helper';
import { ACTOR_ID, insertTestAdmin } from '../helpers/repository-fixtures.helper';
import { describeWithPostgres } from '../helpers/database-availability.helper';

describeWithPostgres('Demonstration content features (PostgreSQL)', () => {
  let context: PostgresTestContext;
  beforeAll(async () => {
    context = await connectTestPostgres();
  });
  beforeEach(async () => {
    await cleanTestDatabase(context);
    await insertTestAdmin(context);
  });
  afterAll(async () => context?.pool.end());

  it('enforces blog slug uniqueness and hides drafts from public queries', async () => {
    const repository = new DrizzleBlogRepository(context.db);
    const draft = await repository.create(
      {
        slug: 'autism-support',
        languageCode: 'en',
        title: 'Autism support',
        excerpt: 'Practical support',
        content: 'Published searchable guidance',
        createdBy: ACTOR_ID,
      },
      ACTOR_ID,
    );
    await expect(repository.findPublished(draft.slug, 'en')).resolves.toBeNull();
    await repository.publish(draft.id, ACTOR_ID);
    await expect(repository.findPublished(draft.slug, 'en')).resolves.toMatchObject({
      status: 'PUBLISHED',
    });
    await expectPostgresError(
      repository.create(
        {
          slug: draft.slug,
          languageCode: 'en',
          title: 'Duplicate',
          excerpt: 'Duplicate',
          content: 'Duplicate',
          createdBy: ACTOR_ID,
        },
        ACTOR_ID,
      ),
      '23505',
    );
  });

  it('audits every blog mutation using the acting administrator', async () => {
    const repository = new DrizzleBlogRepository(context.db);
    const created = await repository.create(
      {
        slug: 'audit-blog',
        languageCode: 'en',
        title: 'Audit blog',
        excerpt: 'Audit',
        content: 'Audit content',
        createdBy: ACTOR_ID,
      },
      ACTOR_ID,
    );
    await repository.update(created.id, { title: 'Updated audit blog' }, ACTOR_ID);
    await repository.publish(created.id, ACTOR_ID);
    await repository.delete(created.id, ACTOR_ID);

    const logs = await context.db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, 'BLOG_POST'), eq(auditLogs.entityId, created.id)));
    expect(logs.map((log) => log.action)).toEqual(
      expect.arrayContaining(['CREATE', 'UPDATE', 'PUBLISH', 'DELETE']),
    );
    expect(logs).toHaveLength(4);
    expect(logs.every((log) => log.adminId === ACTOR_ID)).toBe(true);
  });

  it('rolls back a blog mutation when its audit write fails', async () => {
    const repository = new DrizzleBlogRepository(context.db);
    const created = await repository.create(
      {
        slug: 'rollback-blog',
        languageCode: 'en',
        title: 'Rollback blog',
        excerpt: 'Rollback',
        content: 'Rollback content',
        createdBy: ACTOR_ID,
      },
      ACTOR_ID,
    );

    await expectPostgresError(repository.publish(created.id, randomUUID()), '23503');
    const [stored] = await context.db.select().from(blogPosts).where(eq(blogPosts.id, created.id));
    expect(stored.status).toBe('DRAFT');
  });

  it('audits resource mutations and increments downloads atomically', async () => {
    const repository = new DrizzleResourceRepository(context.db);
    const created = await repository.create(
      {
        title: 'Family guide',
        description: 'Free guide',
        fileUrl: 'http://localhost/guide.pdf',
        fileName: 'guide.pdf',
        mimeType: 'application/pdf',
        languageCode: 'en',
        createdBy: ACTOR_ID,
      },
      ACTOR_ID,
    );
    await repository.publish(created.id, ACTOR_ID);
    await Promise.all([
      repository.recordPublishedDownload(created.id, 'ET'),
      repository.recordPublishedDownload(created.id, null),
    ]);
    const [stored] = await context.db.select().from(resources);
    expect(stored.downloadCount).toBe(2);
    expect(stored.fileName).toBe('guide.pdf');
    const downloads = await context.db
      .select()
      .from(resourceDownloadLogs)
      .where(eq(resourceDownloadLogs.resourceId, created.id));
    expect(downloads).toHaveLength(2);
    expect(downloads.map((download) => download.country)).toEqual(
      expect.arrayContaining(['ET', null]),
    );
    expect(downloads.every((download) => download.downloadedAt instanceof Date)).toBe(true);

    await expectPostgresError(repository.recordPublishedDownload(created.id, 'E1'), '23514');
    const [afterRejectedLocation] = await context.db
      .select()
      .from(resources)
      .where(eq(resources.id, created.id));
    expect(afterRejectedLocation.downloadCount).toBe(2);

    await context.db
      .update(resourceDownloadLogs)
      .set({ downloadedAt: new Date('2024-01-01T00:00:00Z') })
      .where(eq(resourceDownloadLogs.id, downloads[0].id));
    await repository.purgeDownloadLogsBefore(new Date('2025-01-01T00:00:00Z'));
    const retainedDownloads = await context.db
      .select()
      .from(resourceDownloadLogs)
      .where(eq(resourceDownloadLogs.resourceId, created.id));
    expect(retainedDownloads).toHaveLength(1);

    await repository.delete(created.id, ACTOR_ID);
    const logs = await context.db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, 'RESOURCE'), eq(auditLogs.entityId, created.id)));
    expect(logs.map((log) => log.action)).toEqual(
      expect.arrayContaining(['CREATE', 'PUBLISH', 'DELETE']),
    );
    expect(logs).toHaveLength(3);
    expect(logs.every((log) => log.adminId === ACTOR_ID)).toBe(true);
  });

  it('rolls back a resource mutation when its audit write fails', async () => {
    const repository = new DrizzleResourceRepository(context.db);
    const created = await repository.create(
      {
        title: 'Rollback guide',
        description: 'Rollback',
        fileUrl: 'http://localhost/rollback.pdf',
        fileName: 'rollback.pdf',
        mimeType: 'application/pdf',
        languageCode: 'en',
        createdBy: ACTOR_ID,
      },
      ACTOR_ID,
    );

    await expectPostgresError(repository.publish(created.id, randomUUID()), '23503');
    const [stored] = await context.db.select().from(resources).where(eq(resources.id, created.id));
    expect(stored.status).toBe('DRAFT');
  });

  it('searches only published CMS, events, and blog content', async () => {
    await context.db.insert(cmsPages).values({
      slug: 'home',
      languageCode: 'en',
      title: 'Support at home',
      content: 'Family support',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      createdBy: ACTOR_ID,
    });
    await context.db.insert(events).values({
      slug: 'family-day',
      title: 'Family support day',
      description: 'Community',
      startDate: new Date(Date.now() + 60_000),
      endDate: new Date(Date.now() + 120_000),
      location: 'Addis Ababa',
      status: 'PUBLISHED',
      languageCode: 'en',
      createdBy: ACTOR_ID,
    });
    await context.db.insert(blogPosts).values({
      slug: 'draft-support',
      title: 'Hidden support',
      excerpt: 'Hidden',
      content: 'support',
      status: 'DRAFT',
      languageCode: 'en',
      createdBy: ACTOR_ID,
    });
    const result = await new SearchService(new DrizzleSearchRepository(context.db)).search({
      q: 'support',
      languageCode: 'en',
    });
    expect(result.results.map((item) => item.type)).toEqual(
      expect.arrayContaining(['page', 'event']),
    );
    expect(result.results).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: 'draft-support' })]),
    );
  });
});
