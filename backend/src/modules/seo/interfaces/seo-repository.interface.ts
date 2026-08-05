import { SeoLanguageCode, SeoRecord } from './seo-response.interface';

export const SEO_REPOSITORY = Symbol('SEO_REPOSITORY');

export interface SeoUpdate {
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[];
  seoImageUrl?: string | null;
}

export interface SeoRepository {
  findPublished(slug: string, languageCode: SeoLanguageCode): Promise<SeoRecord | null>;
  update(
    slug: string,
    languageCode: SeoLanguageCode,
    changes: SeoUpdate,
    actorId: string,
  ): Promise<SeoRecord | null>;
}
