import { blogPosts, cmsPages, events, resources } from '../../src/database/schema';
import { BlogRepository } from '../../src/modules/blog/blog.repository';
import { NOOP_CACHE } from '../../src/modules/cache/cache.interface';
import { ResourcesService } from '../../src/modules/resources/resources.service';
import { SearchService } from '../../src/modules/search/search.service';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import {
  connectTestPostgres,
  expectPostgresError,
  PostgresTestContext,
} from '../helpers/postgres-test.helper';
import { ACTOR_ID, insertTestAdmin } from '../helpers/repository-fixtures.helper';

const describeWithPostgres = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeWithPostgres('Demonstration content features (PostgreSQL)', () => {
  let context: PostgresTestContext;
  beforeAll(async () => { context = await connectTestPostgres(); });
  beforeEach(async () => { await cleanTestDatabase(context); await insertTestAdmin(context); });
  afterAll(async () => context?.pool.end());

  it('enforces blog slug uniqueness and hides drafts from public queries', async () => {
    const repository = new BlogRepository(context.db);
    const draft = await repository.create({
      slug: 'autism-support',
      languageCode: 'en',
      title: 'Autism support',
      excerpt: 'Practical support',
      content: 'Published searchable guidance',
      createdBy: ACTOR_ID,
    });
    await expect(repository.findPublished(draft.slug, 'en')).resolves.toBeNull();
    await repository.publish(draft.id);
    await expect(repository.findPublished(draft.slug, 'en')).resolves.toMatchObject({ status: 'PUBLISHED' });
    await expectPostgresError(repository.create({
      slug: draft.slug, languageCode: 'en', title: 'Duplicate', excerpt: 'Duplicate',
      content: 'Duplicate', createdBy: ACTOR_ID,
    }), '23505');
  });

  it('increments resource downloads atomically without losing persisted metadata', async () => {
    const service = new ResourcesService(context.db, NOOP_CACHE);
    const created = await service.create({
      title: 'Family guide', description: 'Free guide', fileUrl: 'http://localhost/guide.pdf',
      fileName: 'guide.pdf', mimeType: 'application/pdf', languageCode: 'en',
    }, { id: ACTOR_ID, name: 'Admin', email: 'admin@test.local', role: 'SUPER_ADMIN' });
    await service.publish(created.id);
    await Promise.all([service.download(created.id), service.download(created.id)]);
    const [stored] = await context.db.select().from(resources);
    expect(stored.downloadCount).toBe(2);
    expect(stored.fileName).toBe('guide.pdf');
  });

  it('searches only published CMS, events, and blog content', async () => {
    await context.db.insert(cmsPages).values({
      slug: 'home', languageCode: 'en', title: 'Support at home', content: 'Family support',
      status: 'PUBLISHED', publishedAt: new Date(), createdBy: ACTOR_ID,
    });
    await context.db.insert(events).values({
      slug: 'family-day', title: 'Family support day', description: 'Community',
      startDate: new Date(Date.now() + 60_000), endDate: new Date(Date.now() + 120_000),
      location: 'Addis Ababa', status: 'PUBLISHED', languageCode: 'en', createdBy: ACTOR_ID,
    });
    await context.db.insert(blogPosts).values({
      slug: 'draft-support', title: 'Hidden support', excerpt: 'Hidden', content: 'support',
      status: 'DRAFT', languageCode: 'en', createdBy: ACTOR_ID,
    });
    const result = await new SearchService(context.db).search({ q: 'support', languageCode: 'en' });
    expect(result.results.map((item) => item.type)).toEqual(expect.arrayContaining(['page', 'event']));
    expect(result.results).not.toEqual(expect.arrayContaining([expect.objectContaining({ slug: 'draft-support' })]));
  });
});
