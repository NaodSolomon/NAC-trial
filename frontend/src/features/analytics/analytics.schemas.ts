import { z } from 'zod';

const countSchema = z.number().int().nonnegative();
const moneySchema = z.string().regex(/^\d+(?:\.\d{1,2})?$/);

export const analyticsSummarySchema = z.object({
  totalVisitors: countSchema,
  topCountries: z.array(z.object({ country: z.string().length(2), visits: countSchema })),
  topPages: z.array(z.object({ route: z.string().min(1), visits: countSchema })),
  forms: z.object({
    totalSubmissions: countSchema,
    contact: countSchema,
    volunteer: countSchema,
    newsletter: countSchema,
    eventRsvp: countSchema,
  }),
  resources: z.object({
    totalDownloads: countSchema,
    topResources: z.array(
      z.object({
        resourceId: z.string().uuid(),
        title: z.string().min(1),
        downloads: countSchema,
      }),
    ),
    topCountries: z.array(z.object({ country: z.string().length(2), downloads: countSchema })),
  }),
  donations: z.object({
    totalDonations: countSchema,
    statusCounts: z.array(
      z.object({
        status: z.enum(['INITIATED', 'PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED']),
        count: countSchema,
      }),
    ),
    confirmedValues: z.array(z.object({ currency: z.enum(['USD', 'ETB']), amount: moneySchema })),
  }),
});

export const analyticsTimelineSchema = z.array(
  z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    visitors: countSchema,
    formSubmissions: countSchema,
    resourceDownloads: countSchema,
    donationsCreated: countSchema,
    donationsConfirmed: countSchema,
    confirmedUsd: moneySchema,
    confirmedEtb: moneySchema,
  }),
);

export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;
export type AnalyticsTimeline = z.infer<typeof analyticsTimelineSchema>;
export type AnalyticsRange = 'day' | 'week' | 'month';
