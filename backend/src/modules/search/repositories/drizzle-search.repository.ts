import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, lte, or } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import * as schema from '../../../database/schema';
import { blogPosts, cmsPages, events } from '../../../database/schema';
import {
  SearchCriteria,
  SearchRecord,
  SearchRepository,
} from '../interfaces/search-repository.interface';

@Injectable()
export class DrizzleSearchRepository implements SearchRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async search(criteria: SearchCriteria): Promise<SearchRecord[]> {
    const pattern = `%${criteria.term}%`;
    const language = criteria.languageCode;
    const [pages, eventRows, blogs] = await Promise.all([
      this.db
        .select({
          slug: cmsPages.slug,
          title: cmsPages.title,
          summary: cmsPages.seoDescription,
          languageCode: cmsPages.languageCode,
          date: cmsPages.publishedAt,
        })
        .from(cmsPages)
        .where(
          and(
            eq(cmsPages.status, 'PUBLISHED'),
            lte(cmsPages.publishedAt, new Date()),
            ...(language ? [eq(cmsPages.languageCode, language)] : []),
            or(ilike(cmsPages.title, pattern), ilike(cmsPages.content, pattern)),
          ),
        )
        .orderBy(desc(cmsPages.publishedAt))
        .limit(10),
      this.db
        .select({
          slug: events.slug,
          title: events.title,
          summary: events.description,
          languageCode: events.languageCode,
          date: events.startDate,
        })
        .from(events)
        .where(
          and(
            eq(events.status, 'PUBLISHED'),
            ...(language ? [eq(events.languageCode, language)] : []),
            or(ilike(events.title, pattern), ilike(events.description, pattern)),
          ),
        )
        .orderBy(desc(events.startDate))
        .limit(10),
      this.db
        .select({
          slug: blogPosts.slug,
          title: blogPosts.title,
          summary: blogPosts.excerpt,
          languageCode: blogPosts.languageCode,
          date: blogPosts.publishedAt,
        })
        .from(blogPosts)
        .where(
          and(
            eq(blogPosts.status, 'PUBLISHED'),
            lte(blogPosts.publishedAt, new Date()),
            ...(language ? [eq(blogPosts.languageCode, language)] : []),
            or(
              ilike(blogPosts.title, pattern),
              ilike(blogPosts.content, pattern),
              ilike(blogPosts.excerpt, pattern),
            ),
          ),
        )
        .orderBy(desc(blogPosts.publishedAt))
        .limit(10),
    ]);

    return [
      ...pages.map((row) => ({ type: 'page' as const, ...row })),
      ...eventRows.map((row) => ({ type: 'event' as const, ...row })),
      ...blogs.map((row) => ({ type: 'blog' as const, ...row })),
    ];
  }
}
