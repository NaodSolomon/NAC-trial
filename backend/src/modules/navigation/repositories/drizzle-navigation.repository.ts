import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PaginatedResult } from '../../../common/types/api-response.type';
import { DRIZZLE } from '../../../database/drizzle.module';
import {
  auditLogs,
  NavigationItem,
  navigationItems,
  NewNavigationItem,
} from '../../../database/schema';
import * as schema from '../../../database/schema';
import {
  NavigationListCriteria,
  NavigationRepository,
} from '../interfaces/navigation-repository.interface';

@Injectable()
export class DrizzleNavigationRepository implements NavigationRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  publicList(languageCode: 'en' | 'am'): Promise<NavigationItem[]> {
    return this.db
      .select()
      .from(navigationItems)
      .where(
        and(eq(navigationItems.languageCode, languageCode), eq(navigationItems.isVisible, true)),
      )
      .orderBy(asc(navigationItems.order), asc(navigationItems.createdAt));
  }

  async list(criteria: NavigationListCriteria): Promise<PaginatedResult<NavigationItem>> {
    const where = criteria.languageCode
      ? eq(navigationItems.languageCode, criteria.languageCode)
      : undefined;
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(navigationItems)
        .where(where)
        .orderBy(asc(navigationItems.order), asc(navigationItems.createdAt))
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ total: count() }).from(navigationItems).where(where),
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

  async create(data: NewNavigationItem, actorId: string): Promise<NavigationItem> {
    return this.db.transaction(async (transaction) => {
      const [created] = await transaction.insert(navigationItems).values(data).returning();

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'CREATE',
        entityType: 'NAVIGATION_ITEM',
        entityId: created.id,
        metadata: {
          label: created.label,
          languageCode: created.languageCode,
        },
      });

      return created;
    });
  }

  async update(
    id: string,
    data: Partial<NewNavigationItem>,
    actorId: string,
  ): Promise<NavigationItem | null> {
    return this.db.transaction(async (transaction) => {
      const [updated] = await transaction
        .update(navigationItems)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(navigationItems.id, id))
        .returning();

      if (!updated) {
        return null;
      }

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'UPDATE',
        entityType: 'NAVIGATION_ITEM',
        entityId: id,
        metadata: { changedFields: Object.keys(data) },
      });

      return updated;
    });
  }

  async delete(id: string, actorId: string): Promise<boolean> {
    return this.db.transaction(async (transaction) => {
      const [deleted] = await transaction
        .delete(navigationItems)
        .where(eq(navigationItems.id, id))
        .returning();

      if (!deleted) {
        return false;
      }

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'DELETE',
        entityType: 'NAVIGATION_ITEM',
        entityId: id,
        metadata: {
          label: deleted.label,
          languageCode: deleted.languageCode,
        },
      });

      return true;
    });
  }
}
