import { z } from 'zod';
import { runtimeInformationSchema } from '../donation.schemas';

const httpUrl = z
  .string()
  .url()
  .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
    message: 'Receipt URL must use HTTP or HTTPS.',
  });

export const donationStatusSchema = z.enum([
  'INITIATED',
  'PENDING',
  'CONFIRMED',
  'FAILED',
  'CANCELLED',
]);

export const adminDonationSchema = z.object({
  id: z.string().uuid(),
  donorName: z.string(),
  donorEmail: z.string().email(),
  message: z.string().nullable(),
  amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  currency: z.enum(['USD', 'ETB']),
  gateway: z.enum(['PAYPAL', 'TELEBIRR', 'CBE']),
  status: donationStatusSchema,
  providerOrderId: z.string().nullable(),
  externalTransactionId: z.string().nullable(),
  receiptUrl: httpUrl.nullable(),
  confirmedAt: z.coerce
    .date()
    .transform((value) => value.toISOString())
    .nullable(),
  createdAt: z.coerce.date().transform((value) => value.toISOString()),
  updatedAt: z.coerce.date().transform((value) => value.toISOString()),
});

export const adminDonationListSchema = z.object({
  data: z.array(adminDonationSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const donationStatsSchema = z.object({
  totalDonations: z.number().int().nonnegative(),
  totals: z.array(
    z.object({
      currency: z.string().min(1),
      amount: z.string().regex(/^\d+(?:\.\d+)?$/),
    }),
  ),
});

export const receiptSchema = z.object({ receiptUrl: httpUrl });
export const resendReceiptSchema = z.object({ status: z.literal('queued') });
export const verifyDonationSchema = z.object({ status: z.literal('CONFIRMED') });
export { runtimeInformationSchema };

export type AdminDonation = z.infer<typeof adminDonationSchema>;
export type DonationStatus = z.infer<typeof donationStatusSchema>;
export type DonationRuntime = z.infer<typeof runtimeInformationSchema>;
