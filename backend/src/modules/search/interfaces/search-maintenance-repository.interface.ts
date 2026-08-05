export const SEARCH_MAINTENANCE_REPOSITORY = Symbol('SEARCH_MAINTENANCE_REPOSITORY');

export const SEARCH_TRIGRAM_INDEXES = [
  'cms_pages_title_trgm_idx',
  'cms_pages_content_trgm_idx',
  'events_title_trgm_idx',
  'events_description_trgm_idx',
  'blog_posts_title_trgm_idx',
  'blog_posts_excerpt_trgm_idx',
  'blog_posts_content_trgm_idx',
] as const;

export type SearchTrigramIndex = (typeof SEARCH_TRIGRAM_INDEXES)[number];

export type SearchReindexResult =
  | { status: 'busy' }
  | {
      status: 'completed';
      indexes: SearchTrigramIndex[];
      startedAt: Date;
      completedAt: Date;
      durationMs: number;
    };

export interface SearchMaintenanceRepository {
  rebuild(): Promise<SearchReindexResult>;
}
