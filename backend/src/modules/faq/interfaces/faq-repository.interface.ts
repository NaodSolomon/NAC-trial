import { PaginatedResult } from '../../../common/types/api-response.type';
import { Faq, NewFaq } from '../../../database/schema';

export const FAQ_REPOSITORY = 'FAQ_REPOSITORY';

export interface FaqCriteria {
  page: number;
  limit: number;
  offset: number;
  sortOrder?: 'asc' | 'desc';
  languageCode?: 'en' | 'am';
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
  category?: string;
}

export interface FaqRepository {
  listPublished(languageCode: 'en' | 'am', category?: string): Promise<Faq[]>;
  listCategories(languageCode: 'en' | 'am'): Promise<string[]>;
  list(criteria: FaqCriteria): Promise<PaginatedResult<Faq>>;
  findById(id: string): Promise<Faq | null>;
  create(data: NewFaq, actorId: string): Promise<Faq>;
  update(id: string, data: Partial<NewFaq>, actorId: string): Promise<Faq | null>;
  publish(id: string, actorId: string): Promise<Faq | null>;
  unpublish(id: string, actorId: string): Promise<Faq | null>;
  reorder(entries: Array<{ id: string; sortOrder: number }>, actorId: string): Promise<number>;
  delete(id: string, actorId: string): Promise<boolean>;
  nextSortOrder(languageCode: 'en' | 'am'): Promise<number>;
}
