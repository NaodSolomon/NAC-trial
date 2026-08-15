import type { z } from 'zod';
import type { donationFormSchema } from './donation.schemas';

export type DonationCurrency = 'USD' | 'ETB';
export type DonationGateway = 'SIMULATED' | 'PAYPAL' | 'TELEBIRR' | 'CBE';
export type DonationStatus = 'INITIATED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';

export interface RuntimeInformation {
  name: string;
  version: string;
  environment: string;
  mode: 'trial' | 'production';
  adapters: {
    storage: string;
    mail: string;
    payment: string;
    cache: string;
  };
  realPaymentsEnabled: boolean;
}

export interface DonationCapabilities {
  runtime: RuntimeInformation;
  gateways: DonationGateway[];
  trialMode: boolean;
  trialControlsEnabled: boolean;
  canCreateDonation: boolean;
}

export interface PublicDonation {
  id: string;
  amount: string;
  currency: DonationCurrency;
  status: DonationStatus;
  gateway: DonationGateway;
  createdAt: string;
  receiptUrl?: string;
}

export type DonationFormValues = z.infer<ReturnType<typeof donationFormSchema>>;
