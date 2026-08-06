import type { Language } from '@/lib/i18n';

export interface PublishedCmsPage {
  id: string;
  slug: string;
  languageCode: Language;
  title: string;
  content: string;
  status: 'PUBLISHED';
  seoTitle: string | null;
  seoDescription: string | null;
  seoImageUrl: string | null;
}
