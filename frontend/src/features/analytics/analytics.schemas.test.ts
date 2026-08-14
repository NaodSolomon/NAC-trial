import { describe, expect, it } from 'vitest';
import { analyticsSummarySchema, analyticsTimelineSchema } from './analytics.schemas';

describe('analytics schemas', () => {
  it('accepts the complete cross-feature dashboard contract', () => {
    expect(
      analyticsSummarySchema.parse({
        totalVisitors: 12,
        topCountries: [{ country: 'ET', visits: 10 }],
        topPages: [{ route: '/', visits: 12 }],
        forms: {
          totalSubmissions: 4,
          contact: 1,
          volunteer: 1,
          newsletter: 1,
          eventRsvp: 1,
        },
        resources: {
          totalDownloads: 3,
          topResources: [
            {
              resourceId: '9a340f0b-57c2-4e12-9e7e-e81779886048',
              title: 'Guide',
              downloads: 3,
            },
          ],
          topCountries: [{ country: 'ET', downloads: 2 }],
        },
        donations: {
          totalDonations: 2,
          statusCounts: [{ status: 'CONFIRMED', count: 2 }],
          confirmedValues: [{ currency: 'ETB', amount: '1500.00' }],
        },
      }).forms.totalSubmissions,
    ).toBe(4);
  });

  it('preserves monetary timeline values as validated decimal strings', () => {
    const [point] = analyticsTimelineSchema.parse([
      {
        date: '2026-08-14',
        visitors: 1,
        formSubmissions: 1,
        resourceDownloads: 1,
        donationsCreated: 1,
        donationsConfirmed: 1,
        confirmedUsd: '25.00',
        confirmedEtb: '0.00',
      },
    ]);
    expect(point.confirmedUsd).toBe('25.00');
  });
});
