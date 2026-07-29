import * as bcrypt from 'bcrypt';
import { sql } from 'drizzle-orm';
import { db, pool } from '../data-source';
import { admins, siteSettings } from '../schema';

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
