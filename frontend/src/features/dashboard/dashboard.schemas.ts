import { z } from 'zod';

export const analyticsSummarySchema = z.object({
  totalVisitors: z.number().int().nonnegative(),
  topCountries: z.array(z.object({ country: z.string(), visits: z.number().int().nonnegative() })),
  topPages: z.array(z.object({ route: z.string(), visits: z.number().int().nonnegative() })),
});

export const donationStatsSchema = z.object({
  totalDonations: z.number().int().nonnegative(),
  totals: z.array(z.object({ currency: z.string(), amount: z.string() })),
});

export const paginatedCountSchema = z.object({
  data: z.array(z.unknown()),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});
