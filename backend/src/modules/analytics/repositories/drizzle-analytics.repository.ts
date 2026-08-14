import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, SQL, sql, sum } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { DRIZZLE } from '../../../database/drizzle.module';
import * as schema from '../../../database/schema';
import {
  analyticsEvents,
  contactSubmissions,
  donations,
  eventRsvps,
  newsletterSubscribers,
  resourceDownloadLogs,
  resources,
  volunteerApplications,
} from '../../../database/schema';
import {
  AnalyticsRepository,
  AnalyticsTimelinePoint,
  DonationCurrency,
  DonationStatus,
} from '../interfaces/analytics-repository.interface';

const DONATION_STATUSES: DonationStatus[] = [
  'INITIATED',
  'PENDING',
  'CONFIRMED',
  'FAILED',
  'CANCELLED',
];
const DONATION_CURRENCIES: DonationCurrency[] = ['USD', 'ETB'];

@Injectable()
export class DrizzleAnalyticsRepository implements AnalyticsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async record(data: Parameters<AnalyticsRepository['record']>[0]) {
    await this.db.insert(analyticsEvents).values(data);
  }

  async summary() {
    const pageViews = eq(analyticsEvents.eventType, 'page_view');
    const [
      [{ totalVisitors }],
      countries,
      pages,
      [{ contact }],
      [{ volunteer }],
      [{ newsletter }],
      [{ eventRsvp }],
      [{ totalDownloads }],
      topResources,
      resourceCountries,
      [{ totalDonations }],
      statusRows,
      valueRows,
    ] = await Promise.all([
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
      this.db.select({ contact: count() }).from(contactSubmissions),
      this.db.select({ volunteer: count() }).from(volunteerApplications),
      this.db.select({ newsletter: count() }).from(newsletterSubscribers),
      this.db.select({ eventRsvp: count() }).from(eventRsvps),
      this.db.select({ totalDownloads: count() }).from(resourceDownloadLogs),
      this.db
        .select({
          resourceId: resources.id,
          title: resources.title,
          downloads: count(resourceDownloadLogs.id),
        })
        .from(resourceDownloadLogs)
        .innerJoin(resources, eq(resourceDownloadLogs.resourceId, resources.id))
        .groupBy(resources.id, resources.title)
        .orderBy(desc(count(resourceDownloadLogs.id)))
        .limit(10),
      this.db
        .select({ country: resourceDownloadLogs.country, downloads: count() })
        .from(resourceDownloadLogs)
        .where(sql`${resourceDownloadLogs.country} is not null`)
        .groupBy(resourceDownloadLogs.country)
        .orderBy(desc(count()))
        .limit(10),
      this.db.select({ totalDonations: count() }).from(donations),
      this.db
        .select({ status: donations.status, count: count() })
        .from(donations)
        .groupBy(donations.status),
      this.db
        .select({ currency: donations.currency, amount: sum(donations.amount) })
        .from(donations)
        .where(eq(donations.status, 'CONFIRMED'))
        .groupBy(donations.currency),
    ]);

    const statusByName = new Map(statusRows.map((row) => [row.status, row.count]));
    const valueByCurrency = new Map(valueRows.map((row) => [row.currency, row.amount ?? '0.00']));
    return {
      totalVisitors,
      topCountries: countries.map(({ country, visits }) => ({ country: country!, visits })),
      topPages: pages,
      forms: {
        totalSubmissions: contact + volunteer + newsletter + eventRsvp,
        contact,
        volunteer,
        newsletter,
        eventRsvp,
      },
      resources: {
        totalDownloads,
        topResources,
        topCountries: resourceCountries.map(({ country, downloads }) => ({
          country: country!,
          downloads,
        })),
      },
      donations: {
        totalDonations,
        statusCounts: DONATION_STATUSES.map((status) => ({
          status,
          count: statusByName.get(status) ?? 0,
        })),
        confirmedValues: DONATION_CURRENCIES.map((currency) => ({
          currency,
          amount: valueByCurrency.get(currency) ?? '0.00',
        })),
      },
    };
  }

  async timeline(days: number): Promise<AnalyticsTimelinePoint[]> {
    const start = this.timelineStart(days);
    const [
      visitorRows,
      contactRows,
      volunteerRows,
      newsletterRows,
      rsvpRows,
      resourceRows,
      donationCreatedRows,
      donationConfirmedRows,
    ] = await Promise.all([
      this.dailyCount(analyticsEvents, analyticsEvents.createdAt, start, [
        eq(analyticsEvents.eventType, 'page_view'),
      ]),
      this.dailyCount(contactSubmissions, contactSubmissions.createdAt, start),
      this.dailyCount(volunteerApplications, volunteerApplications.createdAt, start),
      this.dailyCount(newsletterSubscribers, newsletterSubscribers.createdAt, start),
      this.dailyCount(eventRsvps, eventRsvps.createdAt, start),
      this.dailyCount(resourceDownloadLogs, resourceDownloadLogs.downloadedAt, start),
      this.dailyCount(donations, donations.createdAt, start),
      this.db
        .select({
          date: this.utcDate(donations.confirmedAt),
          currency: donations.currency,
          count: count(),
          amount: sum(donations.amount),
        })
        .from(donations)
        .where(
          and(
            eq(donations.status, 'CONFIRMED'),
            sql`${donations.confirmedAt} is not null`,
            gte(donations.confirmedAt, start),
          ),
        )
        .groupBy(this.utcDay(donations.confirmedAt), donations.currency)
        .orderBy(this.utcDay(donations.confirmedAt)),
    ]);

    const visitorByDate = this.countMap(visitorRows);
    const formByDate = this.combinedCountMap(contactRows, volunteerRows, newsletterRows, rsvpRows);
    const resourceByDate = this.countMap(resourceRows);
    const donationCreatedByDate = this.countMap(donationCreatedRows);
    const confirmedByDate = new Map<string, number>();
    const valueByDateCurrency = new Map<string, string>();
    for (const row of donationConfirmedRows) {
      confirmedByDate.set(row.date, (confirmedByDate.get(row.date) ?? 0) + row.count);
      valueByDateCurrency.set(`${row.date}:${row.currency}`, row.amount ?? '0.00');
    }

    return Array.from({ length: days }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      return {
        date: key,
        visitors: visitorByDate.get(key) ?? 0,
        formSubmissions: formByDate.get(key) ?? 0,
        resourceDownloads: resourceByDate.get(key) ?? 0,
        donationsCreated: donationCreatedByDate.get(key) ?? 0,
        donationsConfirmed: confirmedByDate.get(key) ?? 0,
        confirmedUsd: valueByDateCurrency.get(`${key}:USD`) ?? '0.00',
        confirmedEtb: valueByDateCurrency.get(`${key}:ETB`) ?? '0.00',
      };
    });
  }

  private timelineStart(days: number): Date {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  private utcDay(column: PgColumn) {
    return sql`date_trunc('day', ${column} at time zone 'UTC')`;
  }

  private utcDate(column: PgColumn) {
    return sql<string>`to_char(${this.utcDay(column)}, 'YYYY-MM-DD')`;
  }

  private async dailyCount(
    table: PgTable,
    createdAt: PgColumn,
    start: Date,
    filters: SQL[] = [],
  ): Promise<Array<{ date: string; count: number }>> {
    return this.db
      .select({ date: this.utcDate(createdAt), count: count() })
      .from(table)
      .where(and(...filters, gte(createdAt, start)))
      .groupBy(this.utcDay(createdAt))
      .orderBy(this.utcDay(createdAt));
  }

  private countMap(rows: Array<{ date: string; count: number }>) {
    return new Map(rows.map((row) => [row.date, row.count]));
  }

  private combinedCountMap(...groups: Array<Array<{ date: string; count: number }>>) {
    const combined = new Map<string, number>();
    for (const rows of groups) {
      for (const row of rows) combined.set(row.date, (combined.get(row.date) ?? 0) + row.count);
    }
    return combined;
  }
}
