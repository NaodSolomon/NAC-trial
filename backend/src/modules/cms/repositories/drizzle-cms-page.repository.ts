import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, lte, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PaginatedResult } from '../../../common/types/api-response.type';
import { DRIZZLE } from '../../../database/drizzle.module';
import { auditLogs, CmsPage, cmsPages, NewCmsPage } from '../../../database/schema';
import * as schema from '../../../database/schema';
import {
  CmsPageListCriteria,
  CmsPageRepository,
} from '../interfaces/cms-page-repository.interface';

@Injectable()
export class DrizzleCmsPageRepository implements CmsPageRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async list(criteria: CmsPageListCriteria): Promise<PaginatedResult<CmsPage>> {
    const filters: SQL[] = [];

    if (criteria.languageCode) {
      filters.push(eq(cmsPages.languageCode, criteria.languageCode));
    }
    if (criteria.status) {
      filters.push(eq(cmsPages.status, criteria.status));
    }

    const where = filters.length ? and(...filters) : undefined;
    const order = criteria.sortOrder === 'asc' ? asc(cmsPages.createdAt) : desc(cmsPages.createdAt);
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(cmsPages)
        .where(where)
        .orderBy(order)
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ total: count() }).from(cmsPages).where(where),
    ]);

    return {
      data,
      meta: {
        total,
        page: criteria.page,
        limit: criteria.limit,
        totalPages: Math.ceil(total / criteria.limit),
      },
    };
  }

  async findById(id: string): Promise<CmsPage | null> {
    const [page] = await this.db.select().from(cmsPages).where(eq(cmsPages.id, id)).limit(1);

    return page ?? null;
  }

  async findPublished(slug: string, languageCode: 'en' | 'am'): Promise<CmsPage | null> {
    const [page] = await this.db
      .select()
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

    return page ?? null;
  }

  async isSlugAvailable(slug: string, languageCode: 'en' | 'am'): Promise<boolean> {
    const [page] = await this.db
      .select({ id: cmsPages.id })
      .from(cmsPages)
      .where(and(eq(cmsPages.slug, slug), eq(cmsPages.languageCode, languageCode)))
      .limit(1);

    return !page;
  }

  async create(data: NewCmsPage, actorId: string): Promise<CmsPage> {
    return this.db.transaction(async (transaction) => {
      const [created] = await transaction.insert(cmsPages).values(data).returning();

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'CREATE',
        entityType: 'CMS_PAGE',
        entityId: created.id,
        metadata: {
          slug: created.slug,
          languageCode: created.languageCode,
        },
      });

      return created;
    });
  }

  async update(id: string, data: Partial<NewCmsPage>, actorId: string): Promise<CmsPage | null> {
    return this.db.transaction(async (transaction) => {
      const [existing] = await transaction
        .select()
        .from(cmsPages)
        .where(eq(cmsPages.id, id))
        .for('update');

      if (!existing) {
        return null;
      }

      const [updated] = await transaction
        .update(cmsPages)
        .set({
          ...data,
          ...(existing.status === 'PUBLISHED' && {
            status: 'DRAFT' as const,
            publishedAt: null,
          }),
          scheduledAt: null,
          updatedAt: new Date(),
        })
        .where(eq(cmsPages.id, id))
        .returning();

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'UPDATE',
        entityType: 'CMS_PAGE',
        entityId: id,
        metadata: {
          changedFields: Object.keys(data),
          returnedToDraft: existing.status === 'PUBLISHED',
        },
      });

      return updated;
    });
  }

  async publish(id: string, actorId: string): Promise<CmsPage | null> {
    return this.db.transaction(async (transaction) => {
      const [published] = await transaction
        .update(cmsPages)
        .set({
          status: 'PUBLISHED',
          publishedAt: new Date(),
          scheduledAt: null,
          updatedAt: new Date(),
        })
        .where(eq(cmsPages.id, id))
        .returning();

      if (!published) {
        return null;
      }

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'PUBLISH',
        entityType: 'CMS_PAGE',
        entityId: id,
        metadata: {
          slug: published.slug,
          languageCode: published.languageCode,
        },
      });

      return published;
    });
  }

  async schedule(id: string, scheduledAt: Date, actorId: string): Promise<CmsPage | null> {
    return this.db.transaction(async (transaction) => {
      const [scheduled] = await transaction
        .update(cmsPages)
        .set({
          status: 'SCHEDULED',
          scheduledAt,
          publishedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(cmsPages.id, id))
        .returning();

      if (!scheduled) {
        return null;
      }

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'SCHEDULE',
        entityType: 'CMS_PAGE',
        entityId: id,
        metadata: { scheduledAt: scheduledAt.toISOString() },
      });

      return scheduled;
    });
  }

  async delete(id: string, actorId: string): Promise<boolean> {
    return this.db.transaction(async (transaction) => {
      const [deleted] = await transaction.delete(cmsPages).where(eq(cmsPages.id, id)).returning();

      if (!deleted) {
        return false;
      }

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'DELETE',
        entityType: 'CMS_PAGE',
        entityId: id,
        metadata: {
          slug: deleted.slug,
          languageCode: deleted.languageCode,
        },
      });

      return true;
    });
  }

  async publishScheduled(now: Date): Promise<number> {
    return this.db.transaction(async (transaction) => {
      const published = await transaction
        .update(cmsPages)
        .set({
          status: 'PUBLISHED',
          publishedAt: now,
          scheduledAt: null,
          updatedAt: now,
        })
        .where(and(eq(cmsPages.status, 'SCHEDULED'), lte(cmsPages.scheduledAt, now)))
        .returning();

      if (published.length) {
        await transaction.insert(auditLogs).values(
          published.map((page) => ({
            adminId: null,
            action: 'AUTO_PUBLISH',
            entityType: 'CMS_PAGE',
            entityId: page.id,
            metadata: {
              slug: page.slug,
              languageCode: page.languageCode,
            },
          })),
        );
      }

      return published.length;
    });
  }
}
