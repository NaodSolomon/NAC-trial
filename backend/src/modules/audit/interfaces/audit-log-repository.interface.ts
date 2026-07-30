import { PaginatedResult } from '../../../common/types/api-response.type';
import { AuditLog } from '../../../database/schema';

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

export interface AuditLogCriteria {
  page: number;
  limit: number;
  offset: number;
  sortOrder: 'asc' | 'desc';
  adminId?: string;
  entityType?: string;
  action?: string;
  from?: Date;
  to?: Date;
}

export interface AppendAuditEvent {
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogRepository {
  list(criteria: AuditLogCriteria): Promise<PaginatedResult<AuditLog>>;
  append(event: AppendAuditEvent): Promise<AuditLog>;
}
