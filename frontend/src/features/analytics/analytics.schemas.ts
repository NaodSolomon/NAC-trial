import { z } from 'zod';

export const analyticsSummarySchema = z.object({
  totalVisitors: z.number().int().nonnegative(),
  topCountries: z.array(
    z.object({ country: z.string().min(1), visits: z.number().int().nonnegative() }),
  ),
  topPages: z.array(z.object({ route: z.string().min(1), visits: z.number().int().nonnegative() })),
});

export const analyticsTimelineSchema = z.array(
  z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    visitors: z.number().int().nonnegative(),
  }),
);

export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;
export type AnalyticsTimeline = z.infer<typeof analyticsTimelineSchema>;
export type AnalyticsRange = 'day' | 'week' | 'month';
