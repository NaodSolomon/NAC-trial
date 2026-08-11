import { z } from 'zod';
import type { Language } from '@/lib/i18n';

const languageCode = z.enum(['en', 'am']);

export const publicContactPageSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(20_000),
  email: z.string().email().nullable(),
  phone: z.string().min(1).max(100).nullable(),
  address: z.string().min(1).max(500).nullable(),
  mapEmbedUrl: z.string().url().refine(isApprovedMapUrl, 'Map URL is not approved').nullable(),
  languageCode,
});

export const publicVolunteerPageSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(20_000),
  languageCode,
});

export const publicTestimonialsSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(100),
      text: z.string().min(1).max(5_000),
      languageCode,
      status: z.literal('PUBLISHED'),
    }),
  ),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const submittedSchema = z.object({ status: z.literal('submitted') });
export const subscribedSchema = z.object({ status: z.literal('subscribed') });

export function contactFormSchema(language: Language) {
  const required = language === 'am' ? 'ይህን መስክ ያስገቡ።' : 'This field is required.';
  return z.object({
    name: z.string().trim().min(2, required).max(100),
    email: z
      .string()
      .trim()
      .email(language === 'am' ? 'ትክክለኛ ኢሜይል ያስገቡ።' : 'Enter a valid email address.')
      .max(255),
    subject: z.string().trim().max(200).optional(),
    message: z.string().trim().min(10, required).max(5_000),
    languageCode: z.literal(language),
  });
}

export function volunteerFormSchema(language: Language) {
  const required = language === 'am' ? 'ተጨማሪ መረጃ ያስገቡ።' : 'Please provide more information.';
  return z.object({
    name: z.string().trim().min(2, required).max(100),
    email: z
      .string()
      .trim()
      .email(language === 'am' ? 'ትክክለኛ ኢሜይል ያስገቡ።' : 'Enter a valid email address.')
      .max(255),
    phone: z
      .string()
      .trim()
      .regex(
        /^\+?[0-9 ()-]{7,25}$/,
        language === 'am' ? 'ትክክለኛ ስልክ ቁጥር ያስገቡ።' : 'Enter a valid phone number.',
      ),
    roleInterest: z.string().trim().min(2, required).max(150),
    message: z.string().trim().min(20, required).max(5_000),
    languageCode: z.literal(language),
  });
}

export function newsletterFormSchema(language: Language) {
  return z.object({
    email: z
      .string()
      .trim()
      .email(language === 'am' ? 'ትክክለኛ ኢሜይል ያስገቡ።' : 'Enter a valid email address.')
      .max(255),
    languageCode: z.literal(language),
  });
}

export function isApprovedMapUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === 'https:' &&
      (hostname === 'google.com' ||
        hostname.endsWith('.google.com') ||
        hostname === 'googleusercontent.com' ||
        hostname.endsWith('.googleusercontent.com'))
    );
  } catch {
    return false;
  }
}
