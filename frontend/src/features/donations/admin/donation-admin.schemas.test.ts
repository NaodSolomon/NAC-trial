import { describe, expect, it } from 'vitest';
import { adminDonationSchema, donationStatsSchema, receiptSchema } from './donation-admin.schemas';

const donation = {
  id: '00000000-0000-4000-8000-000000004401',
  donorName: 'Trial Donor',
  donorEmail: 'donor@example.org',
  message: null,
  amount: '25.00',
  currency: 'USD',
  gateway: 'PAYPAL',
  status: 'CONFIRMED',
  providerOrderId: 'FAKE-ORDER',
  externalTransactionId: 'FAKE-RECEIPT',
  receiptUrl: 'http://localhost:9000/receipts/test.pdf',
  confirmedAt: '2026-08-12T09:00:00.000Z',
  createdAt: '2026-08-12T08:00:00.000Z',
  updatedAt: '2026-08-12T09:00:00.000Z',
};

describe('donation administration schemas', () => {
  it('parses complete records and currency-separated statistics', () => {
    expect(adminDonationSchema.parse(donation).status).toBe('CONFIRMED');
    expect(
      donationStatsSchema.parse({
        totalDonations: 2,
        totals: [{ currency: 'USD', amount: '50.00' }],
      }).totals[0].amount,
    ).toBe('50.00');
  });

  it('rejects non-HTTP receipt schemes and invalid financial amounts', () => {
    expect(() => receiptSchema.parse({ receiptUrl: 'javascript:alert(1)' })).toThrow();
    expect(() => adminDonationSchema.parse({ ...donation, amount: '-10' })).toThrow();
  });
});
