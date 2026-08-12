import * as bcrypt from 'bcrypt';
import { eq, sql } from 'drizzle-orm';
import { db, pool } from '../data-source';
import { admins, resources, siteSettings } from '../schema';
import { seedDemoContent } from './demo-content.seed';

export const E2E_PASSWORD = 'E2eStrongPassword123!';
export const E2E_ACTORS = [
  {
    name: 'E2E Super Administrator',
    email: 'e2e-super@nehemiah.test',
    role: 'SUPER_ADMIN' as const,
  },
  {
    name: 'E2E Content Editor',
    email: 'e2e-editor@nehemiah.test',
    role: 'CONTENT_EDITOR' as const,
  },
  {
    name: 'E2E Finance Viewer',
    email: 'e2e-finance@nehemiah.test',
    role: 'FINANCE_VIEWER' as const,
  },
];

function assertDedicatedDatabase(): void {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is required for the E2E seed.');
  const databaseName = new URL(value).pathname.replace(/^\//, '');
  if (databaseName !== 'nehemiah_e2e') {
    throw new Error(`E2E seed refuses database "${databaseName}"; expected nehemiah_e2e.`);
  }
}

async function seed(): Promise<void> {
  assertDedicatedDatabase();
  await db
    .insert(siteSettings)
    .values({
      key: 'global',
      siteName: 'Nehemiah Autism Center',
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'am'],
      contactEmail: 'support@nehemiah.test',
      phone: '+251 11 000 0000',
      address: 'Addis Ababa, Ethiopia',
    })
    .onConflictDoNothing({ target: siteSettings.key });
  await seedDemoContent(db);
  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 4);

  for (const actor of E2E_ACTORS) {
    const [existing] = await db
      .select({ id: admins.id })
      .from(admins)
      .where(sql`lower(${admins.email}) = ${actor.email}`)
      .limit(1);
    if (existing) {
      await db
        .update(admins)
        .set({
          ...actor,
          passwordHash,
          isActive: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(admins.id, existing.id));
    } else {
      await db.insert(admins).values({ ...actor, passwordHash });
    }
  }

  const [editor] = await db
    .select({ id: admins.id })
    .from(admins)
    .where(sql`lower(${admins.email}) = 'e2e-editor@nehemiah.test'`)
    .limit(1);
  if (!editor) throw new Error('E2E content editor seed failed.');

  await db
    .insert(resources)
    .values({
      id: '00000000-0000-4000-8000-000000000601',
      title: 'Family support guide',
      description: 'A disposable E2E resource used to verify tracked downloads.',
      fileUrl: `${process.env.STORAGE_PUBLIC_URL ?? 'http://minio-e2e:9000/nehemiah-e2e-media'}/family-support-guide.txt`,
      fileName: 'family-support-guide.txt',
      mimeType: 'text/plain',
      languageCode: 'en',
      status: 'PUBLISHED',
      createdBy: editor.id,
    })
    .onConflictDoNothing({ target: resources.id });

  console.warn('Dedicated nehemiah_e2e data is ready.');
}

void seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => pool.end());
