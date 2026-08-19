import * as bcrypt from 'bcrypt';
import { sql } from 'drizzle-orm';
import { db, pool } from '../data-source';
import { admins, navigationItems, siteSettings } from '../schema';

async function seedBootstrapAdmin(): Promise<void> {
  const name = process.env.SEED_ADMIN_NAME?.trim();
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const suppliedValues = [name, email, password].filter(Boolean);

  if (suppliedValues.length === 0) {
    return;
  }

  if (!name || !email || !password) {
    throw new Error(
      'SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, and SEED_ADMIN_PASSWORD must be provided together.',
    );
  }

  if (password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must contain at least 12 characters.');
  }

  const [existingAdmin] = await db
    .select({ id: admins.id })
    .from(admins)
    .where(sql`lower(${admins.email}) = ${email}`)
    .limit(1);

  if (existingAdmin) {
    console.warn('Bootstrap administrator already exists; leaving it unchanged.');
    return;
  }

  await db.insert(admins).values({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'SUPER_ADMIN',
  });

  console.warn('Bootstrap super administrator created.');
}

const defaultNavigation = [
  { url: '/', en: 'Home', am: 'መነሻ' },
  { url: '/about', en: 'About us', am: 'ስለ እኛ' },
  { url: '/gallery', en: 'Gallery', am: 'ምስሎች' },
  { url: '/events', en: 'Events', am: 'ዝግጅቶች' },
  { url: '/blog', en: 'Blog', am: 'ብሎግ' },
  { url: '/contact', en: 'Contact', am: 'ያግኙን' },
] as const;

async function seedNavigation(): Promise<void> {
  const [existingItem] = await db.select({ id: navigationItems.id }).from(navigationItems).limit(1);
  if (existingItem) {
    return;
  }

  const [anyAdmin] = await db.select({ id: admins.id }).from(admins).limit(1);
  if (!anyAdmin) {
    console.warn('No administrator exists yet; skipping navigation seed.');
    return;
  }

  await db.insert(navigationItems).values(
    defaultNavigation.flatMap((item, index) =>
      (['en', 'am'] as const).map((languageCode) => ({
        label: languageCode === 'en' ? item.en : item.am,
        url: item.url,
        order: index * 10,
        languageCode,
        isVisible: true,
        createdBy: anyAdmin.id,
      })),
    ),
  );

  console.warn('Default navigation created for both languages.');
}

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

  await seedBootstrapAdmin();
  await seedNavigation();

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
