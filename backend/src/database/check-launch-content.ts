import { and, count, eq } from 'drizzle-orm';
import { db, pool } from './data-source';
import { cmsPages, faqs, galleryItems, mediaAssets, resources } from './schema';

const languages = ['en', 'am'] as const;

async function checkLaunchContent(): Promise<void> {
  const failures: string[] = [];

  for (const languageCode of languages) {
    const pages = await db
      .select({ slug: cmsPages.slug, metadata: cmsPages.metadata })
      .from(cmsPages)
      .where(and(eq(cmsPages.languageCode, languageCode), eq(cmsPages.status, 'PUBLISHED')));
    const bySlug = new Map(pages.map((page) => [page.slug, page.metadata]));

    for (const slug of ['home', 'about', 'contact', 'volunteer', 'team']) {
      if (!bySlug.has(slug))
        failures.push(`${languageCode}: published CMS page '${slug}' is missing`);
    }

    const homeSections = arrayValue(objectValue(bySlug.get('home')).sections);
    if (!homeSections.some((section) => objectValue(section).type === 'location')) {
      failures.push(`${languageCode}: homepage location/map section is missing`);
    }

    const about = objectValue(objectValue(bySlug.get('about')).about);
    if (objectValue(bySlug.get('about')).contentApproved !== true) {
      failures.push(`${languageCode}: mission, history, and services lack explicit NAC approval`);
    }
    if (!objectValue(about.mission).body || !objectValue(about.history).body) {
      failures.push(`${languageCode}: authoritative mission or history content is missing`);
    }
    if (!arrayValue(about.services).length) {
      failures.push(`${languageCode}: services overview is missing`);
    }

    if (!arrayValue(objectValue(bySlug.get('volunteer')).volunteerRoles).length) {
      failures.push(`${languageCode}: structured volunteer roles are missing`);
    }
    const teamMetadata = objectValue(bySlug.get('team'));
    if (teamMetadata.contentApproved !== true) {
      failures.push(`${languageCode}: team content lacks explicit NAC approval`);
    }
    if (!arrayValue(teamMetadata.teamMembers).length) {
      failures.push(`${languageCode}: approved team biographies are missing`);
    }

    const [[resourceCount], [galleryCount]] = await Promise.all([
      db
        .select({ value: count() })
        .from(resources)
        .where(and(eq(resources.languageCode, languageCode), eq(resources.status, 'PUBLISHED'))),
      db
        .select({ value: count() })
        .from(galleryItems)
        .where(eq(galleryItems.languageCode, languageCode)),
    ]);
    if (!resourceCount.value) failures.push(`${languageCode}: no published resources exist`);
    if (!galleryCount.value) failures.push(`${languageCode}: no gallery items exist`);

    const [faqCount] = await db
      .select({ value: count() })
      .from(faqs)
      .where(and(eq(faqs.languageCode, languageCode), eq(faqs.status, 'PUBLISHED')));
    if (!faqCount.value) failures.push(`${languageCode}: no published FAQ entries exist`);
  }

  const [{ value: mediaCount }] = await db.select({ value: count() }).from(mediaAssets);
  if (!mediaCount) failures.push('no media assets exist');

  if (failures.length) {
    throw new Error(`Launch content is incomplete:\n- ${failures.join('\n- ')}`);
  }
  console.warn('Launch content check passed for English and Amharic.');
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

void checkLaunchContent()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => pool.end());
