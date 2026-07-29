import { NewAnalyticsEvent } from '../../src/database/schema';

export function analyticsEventFactory(
  overrides: Partial<NewAnalyticsEvent> = {},
): NewAnalyticsEvent {
  return {
    eventType: 'page_view',
    pageUrl: '/about',
    country: 'ET',
    deviceType: 'desktop',
    referrer: null,
    metadata: {},
    ...overrides,
  };
}
