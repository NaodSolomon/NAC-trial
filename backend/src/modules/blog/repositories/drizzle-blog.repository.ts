import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, lte } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import * as schema from '../../../database/schema';
import { auditLogs, blogPosts, NewBlogPost } from '../../../database/schema';
import { BlogListCriteria, BlogRepository } from '../interfaces/blog-repository.interface';

@Injectable()
export class DrizzleBlogRepository implements BlogRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async list(criteria: BlogListCriteria) {
    const filters = [
      ...(criteria.languageCode ? [eq(blogPosts.languageCode, criteria.languageCode)] : []),
      ...(criteria.publicOnly
        ? [eq(blogPosts.status, 'PUBLISHED'), lte(blogPosts.publishedAt, new Date())]
        : []),
    ];
    const where = filters.length ? and(...filters) : undefined;
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(blogPosts)
        .where(where)
        .orderBy(desc(blogPosts.publishedAt))
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ total: count() }).from(blogPosts).where(where),
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

  async findPublished(slug: string, languageCode: 'en' | 'am') {
    const [post] = await this.db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.slug, slug),
          eq(blogPosts.languageCode, languageCode),
          eq(blogPosts.status, 'PUBLISHED'),
          lte(blogPosts.publishedAt, new Date()),
        ),
      )
      .limit(1);

    return post ?? null;
  }

  async create(data: NewBlogPost, actorId: string) {
    return this.db.transaction(async (transaction) => {
      const [created] = await transaction.insert(blogPosts).values(data).returning();

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'CREATE',
        entityType: 'BLOG_POST',
        entityId: created.id,
        metadata: { slug: created.slug, languageCode: created.languageCode },
      });

      return created;
    });
  }

  async update(id: string, data: Partial<NewBlogPost>, actorId: string) {
    return this.db.transaction(async (transaction) => {
      const [existing] = await transaction
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.id, id))
        .for('update');
      if (!existing) return null;

      const [updated] = await transaction
        .update(blogPosts)
        .set({
          ...data,
          status: 'DRAFT',
          publishedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(blogPosts.id, id))
        .returning();

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'UPDATE',
        entityType: 'BLOG_POST',
        entityId: id,
        metadata: {
          changedFields: Object.keys(data),
          returnedToDraft: existing.status === 'PUBLISHED',
        },
      });

      return updated;
    });
  }

  async publish(id: string, actorId: string) {
    return this.db.transaction(async (transaction) => {
      const [published] = await transaction
        .update(blogPosts)
        .set({ status: 'PUBLISHED', publishedAt: new Date(), updatedAt: new Date() })
        .where(eq(blogPosts.id, id))
        .returning();
      if (!published) return null;

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'PUBLISH',
        entityType: 'BLOG_POST',
        entityId: id,
        metadata: { slug: published.slug, languageCode: published.languageCode },
      });

      return published;
    });
  }

  async delete(id: string, actorId: string) {
    return this.db.transaction(async (transaction) => {
      const [deleted] = await transaction.delete(blogPosts).where(eq(blogPosts.id, id)).returning();
      if (!deleted) return false;

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'DELETE',
        entityType: 'BLOG_POST',
        entityId: id,
        metadata: { slug: deleted.slug, languageCode: deleted.languageCode },
      });

      return true;
    });
  }
}
