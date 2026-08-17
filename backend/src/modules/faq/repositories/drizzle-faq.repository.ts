import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, isNotNull, max, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import * as schema from '../../../database/schema';
import { auditLogs, faqs, NewFaq } from '../../../database/schema';
import { FaqCriteria, FaqRepository } from '../interfaces/faq-repository.interface';

@Injectable()
export class DrizzleFaqRepository implements FaqRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async listPublished(languageCode: 'en' | 'am', category?: string) {
    const filters = [
      eq(faqs.languageCode, languageCode),
      eq(faqs.status, 'PUBLISHED'),
      ...(category ? [eq(faqs.category, category)] : []),
    ];

    return this.db
      .select()
      .from(faqs)
      .where(and(...filters))
      .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));
  }

  async listCategories(languageCode: 'en' | 'am') {
    const rows = await this.db
      .selectDistinct({ category: faqs.category })
      .from(faqs)
      .where(
        and(
          eq(faqs.languageCode, languageCode),
          eq(faqs.status, 'PUBLISHED'),
          isNotNull(faqs.category),
        ),
      )
      .orderBy(asc(faqs.category));

    return rows.map((row) => row.category).filter((value): value is string => Boolean(value));
  }

  async list(criteria: FaqCriteria) {
    const filters = [
      ...(criteria.languageCode ? [eq(faqs.languageCode, criteria.languageCode)] : []),
      ...(criteria.status ? [eq(faqs.status, criteria.status)] : []),
      ...(criteria.category ? [eq(faqs.category, criteria.category)] : []),
    ];
    const where = filters.length ? and(...filters) : undefined;
    const order = criteria.sortOrder === 'desc' ? desc(faqs.sortOrder) : asc(faqs.sortOrder);

    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(faqs)
        .where(where)
        .orderBy(order, asc(faqs.createdAt))
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ total: count() }).from(faqs).where(where),
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

  async findById(id: string) {
    const [row] = await this.db.select().from(faqs).where(eq(faqs.id, id)).limit(1);
    return row ?? null;
  }

  async nextSortOrder(languageCode: 'en' | 'am') {
    const [row] = await this.db
      .select({ highest: max(faqs.sortOrder) })
      .from(faqs)
      .where(eq(faqs.languageCode, languageCode));

    return (row?.highest ?? -1) + 1;
  }

  async create(data: NewFaq, actorId: string) {
    return this.db.transaction(async (transaction) => {
      const [created] = await transaction.insert(faqs).values(data).returning();

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'CREATE',
        entityType: 'FAQ',
        entityId: created.id,
        metadata: { translationKey: created.translationKey, languageCode: created.languageCode },
      });

      return created;
    });
  }

  async update(id: string, data: Partial<NewFaq>, actorId: string) {
    return this.db.transaction(async (transaction) => {
      const [updated] = await transaction
        .update(faqs)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(faqs.id, id))
        .returning();

      if (!updated) return null;

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'UPDATE',
        entityType: 'FAQ',
        entityId: updated.id,
        metadata: { fields: Object.keys(data) },
      });

      return updated;
    });
  }

  async publish(id: string, actorId: string) {
    return this.setStatus(id, actorId, 'PUBLISHED');
  }

  async unpublish(id: string, actorId: string) {
    return this.setStatus(id, actorId, 'DRAFT');
  }

  async reorder(entries: Array<{ id: string; sortOrder: number }>, actorId: string) {
    return this.db.transaction(async (transaction) => {
      let updated = 0;

      for (const entry of entries) {
        const [row] = await transaction
          .update(faqs)
          .set({ sortOrder: entry.sortOrder, updatedAt: new Date() })
          .where(eq(faqs.id, entry.id))
          .returning({ id: faqs.id });
        if (row) updated += 1;
      }

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'UPDATE',
        entityType: 'FAQ',
        entityId: null,
        metadata: { reordered: updated },
      });

      return updated;
    });
  }

  async delete(id: string, actorId: string) {
    return this.db.transaction(async (transaction) => {
      const [deleted] = await transaction
        .delete(faqs)
        .where(eq(faqs.id, id))
        .returning({ id: faqs.id, translationKey: faqs.translationKey });

      if (!deleted) return false;

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'DELETE',
        entityType: 'FAQ',
        entityId: deleted.id,
        metadata: { translationKey: deleted.translationKey },
      });

      return true;
    });
  }

  private async setStatus(id: string, actorId: string, status: 'PUBLISHED' | 'DRAFT') {
    return this.db.transaction(async (transaction) => {
      const [updated] = await transaction
        .update(faqs)
        .set({
          status,
          publishedAt: status === 'PUBLISHED' ? sql`now()` : null,
          updatedAt: new Date(),
        })
        .where(eq(faqs.id, id))
        .returning();

      if (!updated) return null;

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: status === 'PUBLISHED' ? 'PUBLISH' : 'UPDATE',
        entityType: 'FAQ',
        entityId: updated.id,
        metadata: { status },
      });

      return updated;
    });
  }
}
