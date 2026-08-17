import { z } from 'zod';
import { adminFaqSchema, type AdminFaq } from './faq.schemas';

export const faqEditorSchema = z.object({
  translationKey: z
    .string()
    .trim()
    .min(2, 'Provide a translation key of at least 2 characters.')
    .max(180, 'Keep the translation key under 180 characters.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens.'),
  languageCode: z.enum(['en', 'am']),
  question: z
    .string()
    .trim()
    .min(2, 'A question is required.')
    .max(500, 'Keep the question under 500 characters.'),
  answer: z
    .string()
    .trim()
    .min(1, 'An answer is required.')
    .max(5_000, 'Keep the answer under 5000 characters.'),
  category: z.string().trim().max(120, 'Keep the category under 120 characters.'),
});

export type FaqEditorValues = z.infer<typeof faqEditorSchema>;

export const emptyFaqEditor: FaqEditorValues = {
  translationKey: '',
  languageCode: 'en',
  question: '',
  answer: '',
  category: '',
};

export function faqEditorFromEntry(entry: AdminFaq): FaqEditorValues {
  return {
    translationKey: entry.translationKey,
    languageCode: entry.languageCode,
    question: entry.question,
    answer: entry.answer,
    category: entry.category ?? '',
  };
}

export function firstFaqEditorError(values: FaqEditorValues): string {
  const result = faqEditorSchema.safeParse(values);
  if (result.success) return '';
  return result.error.issues[0]?.message ?? 'Check the FAQ details and try again.';
}

export { adminFaqSchema };
export type { AdminFaq };
