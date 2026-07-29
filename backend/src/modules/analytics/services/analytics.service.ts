import { Inject, Injectable } from '@nestjs/common';
import { AnalyticsTimelineQueryDto, TrackAnalyticsEventDto } from '../dto/analytics.dto';
import {
  ANALYTICS_REPOSITORY,
  AnalyticsRepository,
} from '../interfaces/analytics-repository.interface';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(ANALYTICS_REPOSITORY)
    private readonly analytics: AnalyticsRepository,
  ) {}

  async track(dto: TrackAnalyticsEventDto, cloudflareCountry?: string) {
    await this.analytics.record({
      eventType: dto.eventType,
      pageUrl: this.pathOnly(dto.pageUrl),
      country: this.country(cloudflareCountry),
      deviceType: dto.deviceType,
      referrer: this.safeReferrer(dto.referrer),
      metadata: {},
    });
    return { status: 'recorded' };
  }

  summary() {
    return this.analytics.summary();
  }

  timeline(query: AnalyticsTimelineQueryDto) {
    const days = { day: 1, week: 7, month: 30 }[query.range];
    return this.analytics.timeline(days);
  }

  private pathOnly(value: string) {
    return new URL(value, 'https://analytics.local').pathname;
  }

  private safeReferrer(value?: string): string | null {
    if (!value) return null;
    try {
      const parsed = new URL(value, 'https://analytics.local');
      return parsed.origin === 'https://analytics.local'
        ? parsed.pathname
        : `${parsed.origin}${parsed.pathname}`;
    } catch {
      return null;
    }
  }

  private country(value?: string): string | null {
    const code = value?.trim().toUpperCase();
    if (!code || !/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'T1') return null;
    return code;
  }
}
