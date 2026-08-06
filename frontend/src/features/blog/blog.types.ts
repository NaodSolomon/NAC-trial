import type { Language } from '@/lib/i18n';

export interface PublishedBlogPost {
  id: string;
  slug: string;
  languageCode: Language;
  title: string;
  excerpt: string;
  content: string;
  status: 'PUBLISHED';
  seoTitle: string | null;
  seoDescription: string | null;
  seoImageUrl: string | null;
  publishedAt: string;
  updatedAt: string;
}

export interface BlogPageData {
  data: PublishedBlogPost[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
