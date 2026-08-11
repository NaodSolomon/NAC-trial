import { browserApiClient } from '@/lib/api/browser-client';
import type { AdminRole } from '@/lib/auth/constants';
import {
  analyticsSummarySchema,
  donationStatsSchema,
  paginatedCountSchema,
} from './dashboard.schemas';

export interface DashboardMetric {
  label: string;
  value: string;
  description: string;
  href: string;
}

export async function loadDashboardMetrics(
  role: AdminRole,
  signal?: AbortSignal,
): Promise<DashboardMetric[]> {
  if (role === 'FINANCE_VIEWER') return donationMetrics(signal);
  if (role === 'CONTENT_EDITOR') return contentMetrics(signal);

  const [analytics, donations] = await Promise.all([
    browserApiClient
      .get<unknown>('/admin/analytics/summary', { signal })
      .then(analyticsSummarySchema.parse),
    browserApiClient
      .get<unknown>('/admin/donations/stats', { signal })
      .then(donationStatsSchema.parse),
  ]);
  return [
    {
      label: 'Page views',
      value: analytics.totalVisitors.toLocaleString(),
      description: 'Recorded privacy-conscious page-view events',
      href: '/admin/analytics',
    },
    ...formatDonationMetrics(donations),
    {
      label: 'Tracked pages',
      value: analytics.topPages.length.toLocaleString(),
      description: 'Pages represented in the analytics summary',
      href: '/admin/analytics',
    },
  ];
}

async function contentMetrics(signal?: AbortSignal): Promise<DashboardMetric[]> {
  const [contacts, events] = await Promise.all([
    browserApiClient
      .get<unknown>('/admin/contact?page=1&limit=1', { signal })
      .then(paginatedCountSchema.parse),
    browserApiClient
      .get<unknown>('/admin/events?page=1&limit=1', { signal })
      .then(paginatedCountSchema.parse),
  ]);
  return [
    {
      label: 'Contact submissions',
      value: contacts.meta.total.toLocaleString(),
      description: 'Messages available to the content team',
      href: '/admin/engagement',
    },
    {
      label: 'Events',
      value: events.meta.total.toLocaleString(),
      description: 'Events in the administration catalogue',
      href: '/admin/events',
    },
  ];
}

async function donationMetrics(signal?: AbortSignal): Promise<DashboardMetric[]> {
  const donations = donationStatsSchema.parse(
    await browserApiClient.get<unknown>('/admin/donations/stats', { signal }),
  );
  return formatDonationMetrics(donations);
}

function formatDonationMetrics(stats: {
  totalDonations: number;
  totals: Array<{ currency: string; amount: string }>;
}): DashboardMetric[] {
  const totals = stats.totals.length
    ? stats.totals.map(({ amount, currency }) => `${amount} ${currency}`).join(' · ')
    : 'No confirmed totals';
  return [
    {
      label: 'Confirmed donations',
      value: stats.totalDonations.toLocaleString(),
      description: totals,
      href: '/admin/donations',
    },
  ];
}
