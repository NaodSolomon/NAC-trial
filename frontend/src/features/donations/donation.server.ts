import 'server-only';

import { createServerApiClient } from '@/lib/api/server-client';
import { deriveDonationCapabilities } from './donation.capabilities';
import {
  donationGatewaysSchema,
  publicDonationSchema,
  runtimeInformationSchema,
} from './donation.schemas';

const client = createServerApiClient();

export async function loadDonationCapabilities() {
  const [runtimeValue, gatewayValue] = await Promise.all([
    client.get<unknown>('/system/version', donationRuntimeCache()),
    client.get<unknown>('/public/donations/gateways', donationRuntimeCache()),
  ]);
  return deriveDonationCapabilities(
    runtimeInformationSchema.parse(runtimeValue),
    donationGatewaysSchema.parse(gatewayValue),
  );
}

export async function loadPublicDonation(id: string) {
  const value = await client.get<unknown>(`/public/donations/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });
  return publicDonationSchema.parse(value);
}

function donationRuntimeCache() {
  return process.env.NODE_ENV === 'development'
    ? { cache: 'no-store' as const }
    : { next: { revalidate: 60, tags: ['donation-runtime'] } };
}
