import { PaginatedResult } from '../../../common/types/api-response.type';
import { Donation, NewDonation } from '../../../database/schema';

export const DONATION_REPOSITORY = Symbol('DONATION_REPOSITORY');

export interface DonationCriteria {
  page: number;
  limit: number;
  offset: number;
  sortOrder: 'asc' | 'desc';
  status?: Donation['status'];
  currency?: Donation['currency'];
  gateway?: Donation['gateway'];
}

export interface DonationStats {
  totalDonations: number;
  totals: Array<{ currency: string; amount: string }>;
}

export interface DonationRepository {
  create(data: NewDonation): Promise<Donation>;
  attachOrder(id: string, providerOrderId: string): Promise<Donation>;
  findById(id: string): Promise<Donation | null>;
  list(criteria: DonationCriteria): Promise<PaginatedResult<Donation>>;
  recent(limit: number): Promise<Donation[]>;
  cancel(id: string): Promise<Donation | null>;
  verify(id: string, actorId: string): Promise<Donation | null>;
  applyWebhook(event: {
    eventId: string;
    eventType: string;
    providerOrderId: string;
    transactionId: string | null;
    status: 'CONFIRMED' | 'FAILED';
  }): Promise<boolean>;
  stats(): Promise<DonationStats>;
  saveReceipt(id: string, url: string): Promise<void>;
  enqueueReceipt(id: string, actorId: string): Promise<void>;
}
