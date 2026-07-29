import { AnalyticsRepository } from '../interfaces/analytics-repository.interface';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let repository: jest.Mocked<AnalyticsRepository>;
  let service: AnalyticsService;

  beforeEach(() => {
    repository = { record: jest.fn(), summary: jest.fn(), timeline: jest.fn() };
    service = new AnalyticsService(repository);
  });

  it('records anonymous analytics and strips query parameters', async () => {
    await service.track(
      {
        eventType: 'page_view',
        pageUrl: '/donate?campaign=private-token',
        deviceType: 'mobile',
        referrer: 'https://search.example/results?q=potential-pii',
      },
      'et',
    );
    expect(repository.record).toHaveBeenCalledWith({
      eventType: 'page_view',
      pageUrl: '/donate',
      country: 'ET',
      deviceType: 'mobile',
      referrer: 'https://search.example/results',
      metadata: {},
    });
  });

  it('discards Cloudflare unknown and Tor country codes', async () => {
    await service.track({ eventType: 'click', pageUrl: '/', deviceType: 'unknown' }, 'T1');
    expect(repository.record).toHaveBeenCalledWith(expect.objectContaining({ country: null }));
  });

  it.each([
    ['day', 1],
    ['week', 7],
    ['month', 30],
  ] as const)('maps %s to a bounded %i-day timeline', async (range, days) => {
    repository.timeline.mockResolvedValue([]);
    await service.timeline({ range });
    expect(repository.timeline).toHaveBeenCalledWith(days);
  });
});
