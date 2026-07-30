import { db, pool } from '../data-source';
import { seedDemoContent } from './demo-content.seed';

async function seed(): Promise<void> {
  console.warn('Seeding trial demonstration content...');
  await seedDemoContent(db);
  console.warn('Demo content seed complete.');
}

void seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
