import { eq } from 'drizzle-orm';
import * as request from 'supertest';
import { auditLogs, cmsPages } from '../../src/database/schema';
import { SEARCH_TRIGRAM_INDEXES } from '../../src/modules/search/interfaces/search-maintenance-repository.interface';
import { authenticatedSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

describe('Search index maintenance (e2e)', () => {
  let context: E2eTestContext;

  beforeAll(async () => {
    context = await createE2eTestContext();
    await context.db.insert(cmsPages).values({
      slug: 'search-maintenance-proof',
      languageCode: 'en',
      title: 'UniqueIndexTerm family support',
      content: 'Search remains available after PostgreSQL index maintenance.',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      createdBy: context.actors.superAdmin.id,
    });
  });

  afterAll(async () => closeE2eTestContext(context));

  it('requires a super administrator', async () => {
    const editor = await authenticatedSession(
      context.app,
      context.actors.editor.email,
      E2E_PASSWORD,
    );
    const finance = await authenticatedSession(
      context.app,
      context.actors.finance.email,
      E2E_PASSWORD,
    );
    const route = '/api/v1/admin/system/search/reindex';

    await request(context.app.getHttpServer()).post(route).expect(401);
    await request(context.app.getHttpServer())
      .post(route)
      .set('Authorization', editor.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .post(route)
      .set('Authorization', finance.authorization)
      .expect(403);
  });

  it('returns conflict and writes no success audit while another rebuild owns the lock', async () => {
    const superAdmin = await authenticatedSession(
      context.app,
      context.actors.superAdmin.email,
      E2E_PASSWORD,
    );
    const lockClient = await context.pool.connect();

    try {
      await lockClient.query('SELECT pg_advisory_lock($1, $2)', [50_325, 26]);
      await request(context.app.getHttpServer())
        .post('/api/v1/admin/system/search/reindex')
        .set('Authorization', superAdmin.authorization)
        .expect(409);
    } finally {
      await lockClient.query('SELECT pg_advisory_unlock($1, $2)', [50_325, 26]);
      lockClient.release();
    }

    const audits = await context.db.select().from(auditLogs).where(eq(auditLogs.action, 'REINDEX'));
    expect(audits).toHaveLength(0);
  });

  it('rebuilds all allowlisted indexes, audits success, and leaves public search functional', async () => {
    const superAdmin = await authenticatedSession(
      context.app,
      context.actors.superAdmin.email,
      E2E_PASSWORD,
    );

    const response = await request(context.app.getHttpServer())
      .post('/api/v1/admin/system/search/reindex')
      .set('Authorization', superAdmin.authorization)
      .expect(200);
    expect(response.body.data).toEqual({
      reindexed: true,
      indexes: [...SEARCH_TRIGRAM_INDEXES],
      completedAt: expect.any(String),
    });
    expect(new Date(response.body.data.completedAt).toString()).not.toBe('Invalid Date');

    const search = await request(context.app.getHttpServer())
      .get('/api/v1/public/search')
      .query({ q: 'UniqueIndexTerm', languageCode: 'en' })
      .expect(200);
    expect(search.body.data.results).toEqual([
      expect.objectContaining({ type: 'page', slug: 'search-maintenance-proof' }),
    ]);

    const [audit] = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'REINDEX'));
    expect(audit).toMatchObject({
      adminId: context.actors.superAdmin.id,
      entityType: 'SEARCH',
      metadata: {
        indexes: [...SEARCH_TRIGRAM_INDEXES],
        startedAt: expect.any(String),
        completedAt: expect.any(String),
        durationMs: expect.any(Number),
      },
    });
  });
});
