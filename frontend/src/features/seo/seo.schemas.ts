import { z } from 'zod';

export const seoResponseSchema = z.object({
  slug: z.string().min(1).max(180),
  languageCode: z.enum(['en', 'am']),
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  keywords: z.array(z.string().max(40)).max(10),
  imageUrl: z.string().url().nullable(),
});

export const seoEditorSchema = z
  .object({
    languageCode: z.enum(['en', 'am']),
    title: z.string().trim().max(70),
    description: z.string().trim().max(160),
    keywordsText: z.string(),
    imageUrl: z.string().trim().max(2_048),
  })
  .superRefine((value, context) => {
    const keywords = normalizeSeoKeywords(value.keywordsText);
    if (keywords.length > 10) {
      context.addIssue({
        code: 'custom',
        path: ['keywordsText'],
        message: 'Use no more than 10 keywords.',
      });
    }
    if (keywords.some((keyword) => keyword.length > 40)) {
      context.addIssue({
        code: 'custom',
        path: ['keywordsText'],
        message: 'Each keyword must be 40 characters or fewer.',
      });
    }
    if (value.imageUrl && !isApprovedSeoImageUrl(value.imageUrl)) {
      context.addIssue({
        code: 'custom',
        path: ['imageUrl'],
        message: 'Use HTTPS or an approved local MinIO image URL.',
      });
    }
  });

export type SeoEditorValues = z.infer<typeof seoEditorSchema>;

export function normalizeSeoKeywords(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((keyword) => keyword.trim().toLocaleLowerCase('en-US'))
        .filter(Boolean),
    ),
  ];
}

export function isApprovedSeoImageUrl(value: string): boolean {
  try {
    const candidate = new URL(value);
    if (candidate.username || candidate.password) return false;
    if (candidate.protocol === 'https:') return true;
    if (candidate.protocol !== 'http:') return false;
    const configured = new URL(process.env.NEXT_PUBLIC_STORAGE_ORIGIN ?? 'http://localhost:9000');
    return (
      ['localhost', '127.0.0.1', 'minio'].includes(candidate.hostname.toLowerCase()) &&
      candidate.origin === configured.origin &&
      (configured.pathname === '/' || candidate.pathname.startsWith(configured.pathname))
    );
  } catch {
    return false;
  }
}
