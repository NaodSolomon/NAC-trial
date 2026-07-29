import { PaginatedResult } from '../../../common/types/api-response.type';
import { NavigationItem, NewNavigationItem } from '../../../database/schema';

export const NAVIGATION_REPOSITORY = Symbol('NAVIGATION_REPOSITORY');

export interface NavigationListCriteria {
  page: number;
  limit: number;
  offset: number;
  languageCode?: 'en' | 'am';
}

export interface NavigationRepository {
  publicList(languageCode: 'en' | 'am'): Promise<NavigationItem[]>;
  list(criteria: NavigationListCriteria): Promise<PaginatedResult<NavigationItem>>;
  create(data: NewNavigationItem, actorId: string): Promise<NavigationItem>;
  update(
    id: string,
    data: Partial<NewNavigationItem>,
    actorId: string,
  ): Promise<NavigationItem | null>;
  delete(id: string, actorId: string): Promise<boolean>;
}
