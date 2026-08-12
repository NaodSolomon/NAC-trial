import { browserApiClient } from '@/lib/api/browser-client';
import {
  cancellationResultSchema,
  createDonationResultSchema,
  publicDonationSchema,
  simulationResultSchema,
} from './donation.schemas';
import type { DonationFormValues, DonationGateway } from './donation.types';

export async function createDonation(values: DonationFormValues, gateway: DonationGateway) {
  return createDonationResultSchema.parse(
    await browserApiClient.post('/public/donations', { ...values, gateway }),
  );
}

export async function refreshDonation(id: string) {
  return publicDonationSchema.parse(
    await browserApiClient.get(`/public/donations/${encodeURIComponent(id)}`, {
      cache: 'no-store',
    }),
  );
}

export async function simulateDonation(id: string, action: 'confirm' | 'fail') {
  return simulationResultSchema.parse(
    await browserApiClient.post(`/test/payments/${encodeURIComponent(id)}/${action}`),
  );
}

export async function cancelDonation(id: string) {
  return cancellationResultSchema.parse(
    await browserApiClient.post(`/public/donations/${encodeURIComponent(id)}/cancel`),
  );
}
