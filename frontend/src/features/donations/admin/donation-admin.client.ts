import { browserApiClient } from '@/lib/api/browser-client';
import { downloadAuthenticatedFile } from '@/lib/api/file-download';
import {
  adminDonationListSchema,
  adminDonationSchema,
  donationStatsSchema,
  receiptSchema,
  resendReceiptSchema,
  runtimeInformationSchema,
  verifyDonationSchema,
} from './donation-admin.schemas';

export interface DonationListCriteria {
  page: number;
  status?: string;
  currency?: string;
  gateway?: string;
  signal?: AbortSignal;
}

function donationQuery(criteria: DonationListCriteria) {
  const query = new URLSearchParams({
    page: String(criteria.page),
    limit: '10',
    sortOrder: 'desc',
  });
  if (criteria.status) query.set('status', criteria.status);
  if (criteria.currency) query.set('currency', criteria.currency);
  if (criteria.gateway) query.set('gateway', criteria.gateway);
  return query;
}

export async function listAdminDonations(criteria: DonationListCriteria) {
  return adminDonationListSchema.parse(
    await browserApiClient.get<unknown>(`/admin/donations?${donationQuery(criteria)}`, {
      signal: criteria.signal,
    }),
  );
}

export async function getDonationStats(signal?: AbortSignal) {
  return donationStatsSchema.parse(
    await browserApiClient.get<unknown>('/admin/donations/stats', { signal }),
  );
}

export async function getAdminDonation(id: string, signal?: AbortSignal) {
  return adminDonationSchema.parse(
    await browserApiClient.get<unknown>(`/admin/donations/${encodeURIComponent(id)}`, { signal }),
  );
}

export async function getDonationRuntime(signal?: AbortSignal) {
  return runtimeInformationSchema.parse(
    await browserApiClient.get<unknown>('/system/version', { signal }),
  );
}

export async function getDonationReceipt(id: string) {
  return receiptSchema.parse(
    await browserApiClient.get<unknown>(`/admin/donations/${encodeURIComponent(id)}/receipt`),
  );
}

export async function resendDonationReceipt(id: string) {
  return resendReceiptSchema.parse(
    await browserApiClient.post<unknown>(
      `/admin/donations/${encodeURIComponent(id)}/resend-receipt`,
    ),
  );
}

export async function verifyDonation(id: string) {
  return verifyDonationSchema.parse(
    await browserApiClient.post<unknown>(`/admin/donations/${encodeURIComponent(id)}/verify`),
  );
}

export function exportDonations(criteria: Omit<DonationListCriteria, 'page' | 'signal'>) {
  const query = donationQuery({ page: 1, ...criteria });
  return downloadAuthenticatedFile(`/admin/donations/export?${query}`, 'donations.csv');
}
