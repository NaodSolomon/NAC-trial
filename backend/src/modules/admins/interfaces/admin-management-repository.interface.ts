import { Admin, NewAdmin } from '../../../database/schema';
import { PaginatedResult } from '../../../common/types/api-response.type';
import { AdminRole } from '../../auth/interfaces/auth.types';

export const ADMIN_MANAGEMENT_REPOSITORY = Symbol('ADMIN_MANAGEMENT_REPOSITORY');

export interface AdminListCriteria {
  page: number;
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  role?: AdminRole;
  isActive?: boolean;
}

export type AdminMutationResult =
  | { status: 'updated'; admin: Admin }
  | { status: 'deleted' }
  | { status: 'not_found' }
  | { status: 'last_super_admin' };

export interface AdminManagementRepository {
  list(criteria: AdminListCriteria): Promise<PaginatedResult<Admin>>;
  create(data: NewAdmin, actorId: string): Promise<Admin>;
  update(id: string, data: Partial<NewAdmin>, actorId: string): Promise<AdminMutationResult>;
  delete(id: string, actorId: string): Promise<AdminMutationResult>;
}
