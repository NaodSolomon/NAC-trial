import { NewAnalyticsEvent } from '../../../database/schema';

export const ANALYTICS_REPOSITORY = Symbol('ANALYTICS_REPOSITORY');

export type DonationStatus = 'INITIATED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
export type DonationCurrency = 'USD' | 'ETB';

export interface AnalyticsSummary {
  totalVisitors: number;
  topCountries: Array<{ country: string; visits: number }>;
  topPages: Array<{ route: string; visits: number }>;
  forms: {
    totalSubmissions: number;
    contact: number;
    volunteer: number;
    newsletter: number;
    eventRsvp: number;
  };
  resources: {
    totalDownloads: number;
    topResources: Array<{ resourceId: string; title: string; downloads: number }>;
    topCountries: Array<{ country: string; downloads: number }>;
  };
  donations: {
    totalDonations: number;
    statusCounts: Array<{ status: DonationStatus; count: number }>;
    confirmedValues: Array<{ currency: DonationCurrency; amount: string }>;
  };
}

export interface AnalyticsTimelinePoint {
  date: string;
  visitors: number;
  formSubmissions: number;
  resourceDownloads: number;
  donationsCreated: number;
  donationsConfirmed: number;
  confirmedUsd: string;
  confirmedEtb: string;
}

export interface AnalyticsRepository {
  record(data: NewAnalyticsEvent): Promise<void>;
  summary(): Promise<AnalyticsSummary>;
  timeline(days: number): Promise<AnalyticsTimelinePoint[]>;
}
