import { z } from 'zod';
import type { Language } from '@/lib/i18n';

const gatewaySchema = z.enum(['PAYPAL', 'TELEBIRR', 'CBE']);
const currencySchema = z.enum(['USD', 'ETB']);
const donationStatusSchema = z.enum(['INITIATED', 'PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED']);

export const runtimeInformationSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  environment: z.string().min(1),
  mode: z.enum(['trial', 'production']),
  adapters: z.object({
    storage: z.string().min(1),
    mail: z.string().min(1),
    payment: z.string().min(1),
    cache: z.string().min(1),
  }),
  realPaymentsEnabled: z.boolean(),
});

export const donationGatewaysSchema = z.array(gatewaySchema);

export const publicDonationSchema = z.object({
  id: z.string().uuid(),
  amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  currency: currencySchema,
  status: donationStatusSchema,
  gateway: gatewaySchema,
  createdAt: z.coerce.date().transform((value) => value.toISOString()),
  receiptUrl: z.string().url().optional(),
});

export const createDonationResultSchema = z.object({
  donationId: z.string().uuid(),
  status: z.literal('PENDING'),
  paymentUrl: z.string().url(),
});

export const simulationResultSchema = z.object({
  donationId: z.string().uuid(),
  status: z.enum(['CONFIRMED', 'FAILED']),
  duplicate: z.boolean(),
  receiptUrl: z.string().url().optional(),
});

export const cancellationResultSchema = z.object({ status: z.literal('CANCELLED') });

export function donationFormSchema(language: Language) {
  return z.object({
    donorName: z
      .string()
      .trim()
      .min(2, language === 'am' ? 'ስምዎን ያስገቡ።' : 'Enter your name.')
      .max(100),
    donorEmail: z
      .string()
      .trim()
      .email(language === 'am' ? 'ትክክለኛ ኢሜይል ያስገቡ።' : 'Enter a valid email address.')
      .max(255),
    amount: z
      .number()
      .min(1, language === 'am' ? 'ዝቅተኛው መጠን 1 ነው።' : 'The minimum amount is 1.')
      .max(1_000_000)
      .refine(
        (value) => Number.isInteger(value * 100),
        language === 'am' ? 'ከሁለት የአስርዮሽ ቦታዎች በላይ አይጠቀሙ።' : 'Use no more than two decimal places.',
      ),
    currency: currencySchema,
    message: z.string().trim().max(1_000).optional(),
  });
}

export function isSafeCheckoutUrl(
  value: string,
  trialMode: boolean,
  donationId: string,
  currentOrigin: string,
): boolean {
  try {
    const url = new URL(value, currentOrigin);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (!trialMode) return url.protocol === 'https:';
    return (
      url.origin === currentOrigin &&
      url.pathname === '/donate/simulated' &&
      url.searchParams.get('donation') === donationId
    );
  } catch {
    return false;
  }
}
