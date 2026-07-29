import { db, pool } from '../data-source';
import { siteSettings } from '../schema';

async function seed(): Promise<void> {
  console.warn('Seeding database...');

  await db
    .insert(siteSettings)
    .values({
      key: 'global',
      siteName: 'Nehemiah Autism Center',
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'am'],
    })
    .onConflictDoNothing({ target: siteSettings.key });

  console.warn('Seeding complete.');
}

void seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
