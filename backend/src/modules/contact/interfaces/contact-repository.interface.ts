import { PaginatedResult } from '../../../common/types/api-response.type';
import { ContactSubmission, NewContactSubmission } from '../../../database/schema';

export const CONTACT_REPOSITORY = Symbol('CONTACT_REPOSITORY');

export interface ContactListCriteria {
  page: number;
  limit: number;
  offset: number;
  sortOrder: 'asc' | 'desc';
  languageCode?: 'en' | 'am';
  search?: string;
}

export interface ContactRepository {
  create(data: NewContactSubmission): Promise<ContactSubmission>;
  list(criteria: ContactListCriteria): Promise<PaginatedResult<ContactSubmission>>;
  delete(id: string, actorId: string): Promise<boolean>;
}
