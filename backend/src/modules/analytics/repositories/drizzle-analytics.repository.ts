import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import * as schema from '../../../database/schema';
import { analyticsEvents } from '../../../database/schema';
import { AnalyticsRepository } from '../interfaces/analytics-repository.interface';

@Injectable()
export class DrizzleAnalyticsRepository implements AnalyticsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async record(data: Parameters<AnalyticsRepository['record']>[0]) {
    await this.db.insert(analyticsEvents).values(data);
  }

  async summary() {
    const pageViews = eq(analyticsEvents.eventType, 'page_view');
    const [[{ totalVisitors }], countries, pages] = await Promise.all([
      this.db.select({ totalVisitors: count() }).from(analyticsEvents).where(pageViews),
      this.db
        .select({ country: analyticsEvents.country, visits: count() })
        .from(analyticsEvents)
        .where(and(pageViews, sql`${analyticsEvents.country} is not null`))
        .groupBy(analyticsEvents.country)
        .orderBy(desc(count()))
        .limit(10),
      this.db
        .select({ route: analyticsEvents.pageUrl, visits: count() })
        .from(analyticsEvents)
        .where(pageViews)
        .groupBy(analyticsEvents.pageUrl)
        .orderBy(desc(count()))
        .limit(10),
    ]);
    return {
      totalVisitors,
      topCountries: countries.map(({ country, visits }) => ({ country: country!, visits })),
      topPages: pages,
    };
  }

  async timeline(days: number) {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);
    const rows = await this.db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${analyticsEvents.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
        visitors: count(),
      })
      .from(analyticsEvents)
      .where(and(eq(analyticsEvents.eventType, 'page_view'), gte(analyticsEvents.createdAt, start)))
      .groupBy(sql`date_trunc('day', ${analyticsEvents.createdAt} at time zone 'UTC')`)
      .orderBy(sql`date_trunc('day', ${analyticsEvents.createdAt} at time zone 'UTC')`);
    const byDate = new Map(rows.map((row) => [row.date, row.visitors]));
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      return { date: key, visitors: byDate.get(key) ?? 0 };
    });
  }
}
