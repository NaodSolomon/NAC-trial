import { browserApiClient } from '@/lib/api/browser-client';
import {
  analyticsSummarySchema,
  analyticsTimelineSchema,
  type AnalyticsRange,
} from './analytics.schemas';

export async function getAnalyticsSummary(signal?: AbortSignal) {
  return analyticsSummarySchema.parse(
    await browserApiClient.get<unknown>('/admin/analytics/summary', { signal }),
  );
}

export async function getAnalyticsTimeline(range: AnalyticsRange, signal?: AbortSignal) {
  return analyticsTimelineSchema.parse(
    await browserApiClient.get<unknown>(`/admin/analytics/timeline?range=${range}`, { signal }),
  );
}
