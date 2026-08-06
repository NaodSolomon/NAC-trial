import { and, eq, inArray } from 'drizzle-orm';
import { admins, cmsPages } from '../../src/database/schema';
import { DEMO_SEED_AUTHOR_ID, seedDemoContent } from '../../src/database/seeds/demo-content.seed';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import { connectTestPostgres, PostgresTestContext } from '../helpers/postgres-test.helper';

const describeWithPostgres = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeWithPostgres('Trial demonstration seed (PostgreSQL)', () => {
  let context: PostgresTestContext;

  beforeAll(async () => {
    context = await connectTestPostgres();
  });

  beforeEach(async () => {
    await cleanTestDatabase(context);
  });

  afterAll(async () => {
    await context?.pool.end();
  });

  it('publishes homepage and FAQ data and remains idempotent', async () => {
    await seedDemoContent(context.db);
    await seedDemoContent(context.db);

    const englishPages = await context.db
      .select()
      .from(cmsPages)
      .where(and(eq(cmsPages.languageCode, 'en'), inArray(cmsPages.slug, ['home', 'faq'])));
    const [amharicHomepage] = await context.db
      .select()
      .from(cmsPages)
      .where(and(eq(cmsPages.languageCode, 'am'), eq(cmsPages.slug, 'home')));
    const authors = await context.db
      .select()
      .from(admins)
      .where(eq(admins.id, DEMO_SEED_AUTHOR_ID));

    expect(englishPages).toHaveLength(2);
    expect(
      englishPages.every((page) => page.status === 'PUBLISHED' && page.publishedAt !== null),
    ).toBe(true);
    expect(englishPages.find((page) => page.slug === 'home')?.metadata.sections).toBeInstanceOf(
      Array,
    );
    expect(englishPages.find((page) => page.slug === 'faq')?.metadata.items).toHaveLength(4);
    expect(amharicHomepage).toMatchObject({
      slug: 'home',
      languageCode: 'am',
      status: 'PUBLISHED',
    });
    expect(amharicHomepage?.metadata.sections).toBeInstanceOf(Array);
    expect(authors).toHaveLength(1);
    expect(authors[0]).toMatchObject({ isActive: false, role: 'CONTENT_EDITOR' });
  });

  it('does not overwrite an existing CMS page', async () => {
    await seedDemoContent(context.db);
    await context.db
      .update(cmsPages)
      .set({ title: 'Edited by an administrator' })
      .where(and(eq(cmsPages.slug, 'home'), eq(cmsPages.languageCode, 'en')));

    await seedDemoContent(context.db);

    const [homepage] = await context.db
      .select()
      .from(cmsPages)
      .where(and(eq(cmsPages.slug, 'home'), eq(cmsPages.languageCode, 'en')));
    expect(homepage.title).toBe('Edited by an administrator');
  });
});
