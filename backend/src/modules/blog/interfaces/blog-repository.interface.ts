import { PaginatedResult } from '../../../common/types/api-response.type';
import { BlogPost, NewBlogPost } from '../../../database/schema';

export const BLOG_REPOSITORY = Symbol('BLOG_REPOSITORY');

export interface BlogListCriteria {
  page: number;
  limit: number;
  offset: number;
  languageCode?: 'en' | 'am';
  publicOnly: boolean;
}

export interface BlogRepository {
  list(criteria: BlogListCriteria): Promise<PaginatedResult<BlogPost>>;
  findPublished(slug: string, languageCode: 'en' | 'am'): Promise<BlogPost | null>;
  create(data: NewBlogPost, actorId: string): Promise<BlogPost>;
  update(id: string, data: Partial<NewBlogPost>, actorId: string): Promise<BlogPost | null>;
  publish(id: string, actorId: string): Promise<BlogPost | null>;
  delete(id: string, actorId: string): Promise<boolean>;
}
