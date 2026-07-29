import { NewAnalyticsEvent } from '../../../database/schema';

export const ANALYTICS_REPOSITORY = Symbol('ANALYTICS_REPOSITORY');

export interface AnalyticsRepository {
  record(data: NewAnalyticsEvent): Promise<void>;
  summary(): Promise<{
    totalVisitors: number;
    topCountries: Array<{ country: string; visits: number }>;
    topPages: Array<{ route: string; visits: number }>;
  }>;
  timeline(days: number): Promise<Array<{ date: string; visitors: number }>>;
}
