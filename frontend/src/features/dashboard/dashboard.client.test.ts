import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadDashboardMetrics } from './dashboard.client';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock('@/lib/api/browser-client', () => ({ browserApiClient: { get: apiGet } }));

describe('role-scoped dashboard metrics', () => {
  beforeEach(() => apiGet.mockReset());

  it('uses only donation statistics for finance viewers', async () => {
    apiGet.mockResolvedValue({ totalDonations: 2, totals: [{ currency: 'USD', amount: '75.00' }] });
    const metrics = await loadDashboardMetrics('FINANCE_VIEWER');
    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(apiGet).toHaveBeenCalledWith('/admin/donations/stats', { signal: undefined });
    expect(metrics[0]).toMatchObject({ label: 'Confirmed donations', value: '2' });
  });

  it('uses only content-team APIs for content editors', async () => {
    apiGet
      .mockResolvedValueOnce({ data: [], meta: { total: 4, page: 1, limit: 1, totalPages: 4 } })
      .mockResolvedValueOnce({ data: [], meta: { total: 3, page: 1, limit: 1, totalPages: 3 } });
    await loadDashboardMetrics('CONTENT_EDITOR');
    expect(apiGet.mock.calls.map(([path]) => path)).toEqual([
      '/admin/contact?page=1&limit=1',
      '/admin/events?page=1&limit=1',
    ]);
  });

  it('uses analytics and donation statistics for super administrators', async () => {
    apiGet
      .mockResolvedValueOnce({ totalVisitors: 12, topCountries: [], topPages: [] })
      .mockResolvedValueOnce({ totalDonations: 1, totals: [] });
    await loadDashboardMetrics('SUPER_ADMIN');
    expect(apiGet.mock.calls.map(([path]) => path)).toEqual([
      '/admin/analytics/summary',
      '/admin/donations/stats',
    ]);
  });
});
