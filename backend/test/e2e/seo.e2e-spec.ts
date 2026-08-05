import { and, eq } from 'drizzle-orm';
import * as request from 'supertest';
import { auditLogs, cmsPages } from '../../src/database/schema';
import { authenticatedSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

describe('SEO endpoints (e2e)', () => {
  let context: E2eTestContext;

  beforeAll(async () => {
    context = await createE2eTestContext();
    await context.db.insert(cmsPages).values([
      {
        slug: 'seo-demo',
        languageCode: 'en',
        title: 'SEO fallback page title',
        content: 'Private full page content',
        metadata: { privateDraftNote: 'must never appear' },
        status: 'PUBLISHED',
        publishedAt: new Date(),
        createdBy: context.actors.superAdmin.id,
      },
      {
        slug: 'seo-demo',
        languageCode: 'am',
        title: 'የገጽ ርዕስ',
        content: 'Amharic full content',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        seoTitle: 'የኦቲዝም ግንዛቤ',
        seoDescription: 'የአማርኛ SEO መግለጫ',
        seoKeywords: ['ኦቲዝም', 'ኢትዮጵያ'],
        createdBy: context.actors.superAdmin.id,
      },
      {
        slug: 'seo-draft',
        languageCode: 'en',
        title: 'Draft page',
        content: 'Draft content',
        status: 'DRAFT',
        seoTitle: 'Draft SEO must stay private',
        createdBy: context.actors.superAdmin.id,
      },
    ]);
  });

  afterAll(async () => closeE2eTestContext(context));

  it('returns minimal published SEO with fallbacks and isolated language variants', async () => {
    const english = await request(context.app.getHttpServer())
      .get('/api/v1/public/seo/seo-demo')
      .expect(200);
    expect(english.body.data).toEqual({
      slug: 'seo-demo',
      languageCode: 'en',
      title: 'SEO fallback page title',
      description: null,
      keywords: [],
      imageUrl: null,
    });
    expect(Object.keys(english.body.data).sort()).toEqual(
      ['slug', 'languageCode', 'title', 'description', 'keywords', 'imageUrl'].sort(),
    );

    const amharic = await request(context.app.getHttpServer())
      .get('/api/v1/public/seo/seo-demo')
      .query({ languageCode: 'am' })
      .expect(200);
    expect(amharic.body.data).toMatchObject({
      languageCode: 'am',
      title: 'የኦቲዝም ግንዛቤ',
      description: 'የአማርኛ SEO መግለጫ',
      keywords: ['ኦቲዝም', 'ኢትዮጵያ'],
    });

    await request(context.app.getHttpServer()).get('/api/v1/public/seo/seo-draft').expect(404);
    await request(context.app.getHttpServer())
      .get('/api/v1/public/seo/seo-demo')
      .query({ languageCode: 'fr' })
      .expect(400);
  });

  it('allows editors to update normalized SEO, invalidates CMS cache, and audits the change', async () => {
    const editor = await authenticatedSession(
      context.app,
      context.actors.editor.email,
      E2E_PASSWORD,
    );

    const response = await request(context.app.getHttpServer())
      .patch('/api/v1/admin/seo/seo-demo')
      .set('Authorization', editor.authorization)
      .send({
        languageCode: 'en',
        title: 'Autism Awareness Ethiopia',
        description: 'Nehemiah Autism Center services and programs.',
        keywords: [' Autism ', 'autism', 'ETHIOPIA', ' therapy '],
        imageUrl: 'https://cdn.example.org/seo/autism-awareness.jpg',
      })
      .expect(200);

    expect(response.body.data).toMatchObject({
      slug: 'seo-demo',
      languageCode: 'en',
      title: 'Autism Awareness Ethiopia',
      description: 'Nehemiah Autism Center services and programs.',
      keywords: ['autism', 'ethiopia', 'therapy'],
      imageUrl: 'https://cdn.example.org/seo/autism-awareness.jpg',
    });
    expect(context.cache.invalidate).toHaveBeenCalledWith('cms');

    const [page] = await context.db
      .select()
      .from(cmsPages)
      .where(and(eq(cmsPages.slug, 'seo-demo'), eq(cmsPages.languageCode, 'en')));
    expect(page).toMatchObject({
      status: 'PUBLISHED',
      seoKeywords: ['autism', 'ethiopia', 'therapy'],
    });
    const [audit] = await context.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'UPDATE_SEO'));
    expect(audit).toMatchObject({
      adminId: context.actors.editor.id,
      entityType: 'CMS_PAGE',
      entityId: page.id,
    });
  });

  it('enforces authentication, roles, metadata bounds, image policy, and nonempty updates', async () => {
    const finance = await authenticatedSession(
      context.app,
      context.actors.finance.email,
      E2E_PASSWORD,
    );
    const editor = await authenticatedSession(
      context.app,
      context.actors.editor.email,
      E2E_PASSWORD,
    );
    const route = '/api/v1/admin/seo/seo-demo';

    await request(context.app.getHttpServer())
      .patch(route)
      .send({ languageCode: 'en', title: 'Valid SEO title' })
      .expect(401);
    await request(context.app.getHttpServer())
      .patch(route)
      .set('Authorization', finance.authorization)
      .send({ languageCode: 'en', title: 'Valid SEO title' })
      .expect(403);
    await request(context.app.getHttpServer())
      .patch(route)
      .set('Authorization', editor.authorization)
      .send({ languageCode: 'en', imageUrl: 'http://unapproved.example.org/image.jpg' })
      .expect(400);
    await request(context.app.getHttpServer())
      .patch(route)
      .set('Authorization', editor.authorization)
      .send({ languageCode: 'en', title: 'x'.repeat(71) })
      .expect(400);
    await request(context.app.getHttpServer())
      .patch(route)
      .set('Authorization', editor.authorization)
      .send({ languageCode: 'en', description: 'x'.repeat(161) })
      .expect(400);
    await request(context.app.getHttpServer())
      .patch(route)
      .set('Authorization', editor.authorization)
      .send({ languageCode: 'en', keywords: Array.from({ length: 11 }, (_, index) => `k${index}`) })
      .expect(400);
    await request(context.app.getHttpServer())
      .patch(route)
      .set('Authorization', editor.authorization)
      .send({ languageCode: 'en' })
      .expect(400);
  });
});
