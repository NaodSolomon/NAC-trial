import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, lte, or } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../database/drizzle.module';
import * as schema from '../../database/schema';
import { blogPosts, cmsPages, events } from '../../database/schema';
import { PublicSearchDto } from './search.dto';

@Injectable()
export class SearchService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async search(query: PublicSearchDto) {
    const term = `%${query.q.trim()}%`;
    const language = query.languageCode;
    const [pages, eventRows, blogs] = await Promise.all([
      this.db.select({ slug: cmsPages.slug, title: cmsPages.title, summary: cmsPages.seoDescription, languageCode: cmsPages.languageCode, date: cmsPages.publishedAt })
        .from(cmsPages).where(and(eq(cmsPages.status, 'PUBLISHED'), lte(cmsPages.publishedAt, new Date()), ...(language ? [eq(cmsPages.languageCode, language)] : []), or(ilike(cmsPages.title, term), ilike(cmsPages.content, term)))).orderBy(desc(cmsPages.publishedAt)).limit(10),
      this.db.select({ slug: events.slug, title: events.title, summary: events.description, languageCode: events.languageCode, date: events.startDate })
        .from(events).where(and(eq(events.status, 'PUBLISHED'), ...(language ? [eq(events.languageCode, language)] : []), or(ilike(events.title, term), ilike(events.description, term)))).orderBy(desc(events.startDate)).limit(10),
      this.db.select({ slug: blogPosts.slug, title: blogPosts.title, summary: blogPosts.excerpt, languageCode: blogPosts.languageCode, date: blogPosts.publishedAt })
        .from(blogPosts).where(and(eq(blogPosts.status, 'PUBLISHED'), lte(blogPosts.publishedAt, new Date()), ...(language ? [eq(blogPosts.languageCode, language)] : []), or(ilike(blogPosts.title, term), ilike(blogPosts.content, term), ilike(blogPosts.excerpt, term)))).orderBy(desc(blogPosts.publishedAt)).limit(10),
    ]);
    return {
      query: query.q.trim(),
      results: [
        ...pages.map((row) => ({ type: 'page', url: `/pages/${row.slug}`, ...row })),
        ...eventRows.map((row) => ({ type: 'event', url: `/events/${row.slug}`, ...row })),
        ...blogs.map((row) => ({ type: 'blog', url: `/blog/${row.slug}`, ...row })),
      ],
    };
  }
}
