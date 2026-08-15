import { and, eq, inArray } from 'drizzle-orm';
import {
  admins,
  blogPosts,
  cmsPages,
  events,
  galleryItems,
  mediaAssets,
  resources,
  testimonials,
} from '../../src/database/schema';
import { DEMO_SEED_AUTHOR_ID, seedDemoContent } from '../../src/database/seeds/demo-content.seed';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import { connectTestPostgres, PostgresTestContext } from '../helpers/postgres-test.helper';
import { describeWithPostgres } from '../helpers/database-availability.helper';

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

  it('publishes bilingual demonstration content and remains idempotent', async () => {
    await seedDemoContent(context.db);
    await seedDemoContent(context.db);

    const englishPages = await context.db
      .select()
      .from(cmsPages)
      .where(
        and(
          eq(cmsPages.languageCode, 'en'),
          inArray(cmsPages.slug, ['home', 'about', 'faq', 'contact', 'volunteer']),
        ),
      );
    const amharicPages = await context.db
      .select()
      .from(cmsPages)
      .where(
        and(
          eq(cmsPages.languageCode, 'am'),
          inArray(cmsPages.slug, ['home', 'about', 'faq', 'contact', 'volunteer']),
        ),
      );
    const authors = await context.db
      .select()
      .from(admins)
      .where(eq(admins.id, DEMO_SEED_AUTHOR_ID));
    const seededBlogs = await context.db.select().from(blogPosts);
    const seededEvents = await context.db.select().from(events);
    const seededTestimonials = await context.db.select().from(testimonials);
    const seededResources = await context.db.select().from(resources);
    const seededMedia = await context.db.select().from(mediaAssets);
    const seededGallery = await context.db.select().from(galleryItems);
    const teamDrafts = await context.db
      .select()
      .from(cmsPages)
      .where(and(eq(cmsPages.slug, 'team'), eq(cmsPages.status, 'DRAFT')));

    expect(englishPages).toHaveLength(5);
    expect(amharicPages).toHaveLength(5);
    expect(
      englishPages.every((page) => page.status === 'PUBLISHED' && page.publishedAt !== null),
    ).toBe(true);
    expect(englishPages.find((page) => page.slug === 'home')?.metadata.sections).toBeInstanceOf(
      Array,
    );
    const homeSections = englishPages.find((page) => page.slug === 'home')?.metadata.sections;
    expect(
      Array.isArray(homeSections) &&
        homeSections.some(
          (section) =>
            typeof section === 'object' &&
            section !== null &&
            'type' in section &&
            section.type === 'location',
        ),
    ).toBe(true);
    expect(englishPages.find((page) => page.slug === 'about')?.metadata.about).toBeDefined();
    expect(englishPages.find((page) => page.slug === 'about')?.metadata.contentApproved).toBe(
      false,
    );
    expect(
      englishPages.find((page) => page.slug === 'volunteer')?.metadata.volunteerRoles,
    ).toHaveLength(3);
    expect(englishPages.find((page) => page.slug === 'faq')?.metadata.items).toHaveLength(4);
    expect(amharicPages.every((page) => page.status === 'PUBLISHED')).toBe(true);
    expect(amharicPages.find((page) => page.slug === 'home')?.metadata.sections).toBeInstanceOf(
      Array,
    );
    expect(amharicPages.find((page) => page.slug === 'faq')?.metadata.items).toHaveLength(2);
    expect(englishPages.find((page) => page.slug === 'contact')?.metadata.mapEmbedUrl).toMatch(
      /^https:\/\/www\.google\.com\/maps/,
    );
    expect(authors).toHaveLength(1);
    expect(authors[0]).toMatchObject({ isActive: false, role: 'CONTENT_EDITOR' });
    expect(seededBlogs).toHaveLength(4);
    expect(seededBlogs.every((post) => post.status === 'PUBLISHED' && post.publishedAt)).toBe(true);
    expect(seededBlogs.filter((post) => post.languageCode === 'en')).toHaveLength(3);
    expect(seededBlogs.filter((post) => post.languageCode === 'am')).toHaveLength(1);
    expect(seededEvents).toHaveLength(6);
    expect(seededEvents.every((event) => event.status === 'PUBLISHED')).toBe(true);
    expect(seededEvents.filter((event) => event.languageCode === 'en')).toHaveLength(3);
    expect(seededEvents.filter((event) => event.languageCode === 'am')).toHaveLength(3);
    expect(
      seededEvents.find(
        (event) => event.slug === 'family-support-day' && event.languageCode === 'en',
      )?.rsvpEnabled,
    ).toBe(true);
    expect(seededTestimonials).toHaveLength(4);
    expect(seededTestimonials.every((testimonial) => testimonial.status === 'PUBLISHED')).toBe(
      true,
    );
    expect(
      seededTestimonials.filter((testimonial) => testimonial.languageCode === 'en'),
    ).toHaveLength(2);
    expect(teamDrafts).toHaveLength(2);
    expect(teamDrafts.every((page) => !page.metadata.teamMembers)).toBe(true);
    expect(seededResources).toHaveLength(2);
    expect(seededResources.every((resource) => resource.status === 'PUBLISHED')).toBe(true);
    expect(seededMedia).toHaveLength(4);
    expect(seededGallery).toHaveLength(4);
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

  it('does not overwrite an existing blog post', async () => {
    await seedDemoContent(context.db);
    await context.db
      .update(blogPosts)
      .set({ title: 'Edited article title' })
      .where(
        and(eq(blogPosts.slug, 'understanding-autism-together'), eq(blogPosts.languageCode, 'en')),
      );

    await seedDemoContent(context.db);

    const [post] = await context.db
      .select()
      .from(blogPosts)
      .where(
        and(eq(blogPosts.slug, 'understanding-autism-together'), eq(blogPosts.languageCode, 'en')),
      );
    expect(post.title).toBe('Edited article title');
  });
});
