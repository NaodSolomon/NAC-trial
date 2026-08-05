import { Inject, Injectable } from '@nestjs/common';
import { and, eq, lte } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import { auditLogs, cmsPages } from '../../../database/schema';
import * as schema from '../../../database/schema';
import { SeoRepository, SeoUpdate } from '../interfaces/seo-repository.interface';
import { SeoLanguageCode, SeoRecord } from '../interfaces/seo-response.interface';

const seoSelection = {
  id: cmsPages.id,
  slug: cmsPages.slug,
  languageCode: cmsPages.languageCode,
  pageTitle: cmsPages.title,
  seoTitle: cmsPages.seoTitle,
  seoDescription: cmsPages.seoDescription,
  seoKeywords: cmsPages.seoKeywords,
  seoImageUrl: cmsPages.seoImageUrl,
};

@Injectable()
export class DrizzleSeoRepository implements SeoRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findPublished(slug: string, languageCode: SeoLanguageCode): Promise<SeoRecord | null> {
    const [record] = await this.db
      .select(seoSelection)
      .from(cmsPages)
      .where(
        and(
          eq(cmsPages.slug, slug),
          eq(cmsPages.languageCode, languageCode),
          eq(cmsPages.status, 'PUBLISHED'),
          lte(cmsPages.publishedAt, new Date()),
        ),
      )
      .limit(1);

    return record ?? null;
  }

  async update(
    slug: string,
    languageCode: SeoLanguageCode,
    changes: SeoUpdate,
    actorId: string,
  ): Promise<SeoRecord | null> {
    return this.db.transaction(async (transaction) => {
      const [existing] = await transaction
        .select({ id: cmsPages.id })
        .from(cmsPages)
        .where(and(eq(cmsPages.slug, slug), eq(cmsPages.languageCode, languageCode)))
        .for('update');

      if (!existing) return null;

      const [updated] = await transaction
        .update(cmsPages)
        .set({ ...changes, updatedAt: new Date() })
        .where(eq(cmsPages.id, existing.id))
        .returning(seoSelection);

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'UPDATE_SEO',
        entityType: 'CMS_PAGE',
        entityId: existing.id,
        metadata: {
          slug,
          languageCode,
          changedFields: Object.keys(changes),
        },
      });

      return updated;
    });
  }
}
