import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, lte } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../database/drizzle.module';
import * as schema from '../../database/schema';
import { blogPosts, NewBlogPost } from '../../database/schema';

@Injectable()
export class BlogRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async list(page: number, limit: number, languageCode?: 'en' | 'am', publicOnly = false) {
    const filters = [
      ...(languageCode ? [eq(blogPosts.languageCode, languageCode)] : []),
      ...(publicOnly ? [eq(blogPosts.status, 'PUBLISHED'), lte(blogPosts.publishedAt, new Date())] : []),
    ];
    const where = filters.length ? and(...filters) : undefined;
    const [data, [{ total }]] = await Promise.all([
      this.db.select().from(blogPosts).where(where).orderBy(desc(blogPosts.publishedAt)).limit(limit).offset((page - 1) * limit),
      this.db.select({ total: count() }).from(blogPosts).where(where),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findPublished(slug: string, languageCode: 'en' | 'am') {
    const [row] = await this.db.select().from(blogPosts).where(and(eq(blogPosts.slug, slug), eq(blogPosts.languageCode, languageCode), eq(blogPosts.status, 'PUBLISHED'), lte(blogPosts.publishedAt, new Date()))).limit(1);
    return row ?? null;
  }

  async create(data: NewBlogPost) {
    const [row] = await this.db.insert(blogPosts).values(data).returning();
    return row;
  }

  async update(id: string, data: Partial<NewBlogPost>) {
    const [row] = await this.db.update(blogPosts).set({ ...data, status: 'DRAFT', publishedAt: null, updatedAt: new Date() }).where(eq(blogPosts.id, id)).returning();
    return row ?? null;
  }

  async publish(id: string) {
    const [row] = await this.db.update(blogPosts).set({ status: 'PUBLISHED', publishedAt: new Date(), updatedAt: new Date() }).where(eq(blogPosts.id, id)).returning();
    return row ?? null;
  }

  async delete(id: string) {
    const rows = await this.db.delete(blogPosts).where(eq(blogPosts.id, id)).returning({ id: blogPosts.id });
    return rows.length > 0;
  }
}
