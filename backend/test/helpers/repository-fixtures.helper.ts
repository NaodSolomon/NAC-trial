import { admins, NewAdmin } from '../../src/database/schema';
import { PostgresTestContext } from './postgres-test.helper';

export const ACTOR_ID = 'b96c693c-45d7-4937-952c-a957eedfdb08';

export async function insertTestAdmin(
  context: PostgresTestContext,
  overrides: Partial<NewAdmin> = {},
) {
  const [admin] = await context.db
    .insert(admins)
    .values({
      id: ACTOR_ID,
      name: 'Integration Administrator',
      email: 'admin@integration.test',
      passwordHash: '$2b$10$integration-test-hash',
      role: 'SUPER_ADMIN',
      ...overrides,
    })
    .returning();
  return admin;
}

export const pageCriteria = {
  page: 1,
  limit: 20,
  offset: 0,
  sortOrder: 'asc' as const,
};
