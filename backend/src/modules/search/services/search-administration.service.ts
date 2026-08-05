import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_LOG_REPOSITORY,
  AuditLogRepository,
} from '../../audit/interfaces/audit-log-repository.interface';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import {
  SEARCH_MAINTENANCE_REPOSITORY,
  SearchMaintenanceRepository,
  SearchTrigramIndex,
} from '../interfaces/search-maintenance-repository.interface';

export interface SearchReindexResponse {
  reindexed: true;
  indexes: SearchTrigramIndex[];
  completedAt: string;
}

@Injectable()
export class SearchAdministrationService {
  constructor(
    @Inject(SEARCH_MAINTENANCE_REPOSITORY)
    private readonly maintenance: SearchMaintenanceRepository,
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async reindex(actor: AdminPrincipal): Promise<SearchReindexResponse> {
    const result = await this.maintenance.rebuild();

    if (result.status === 'busy') {
      throw new ConflictException('A search index rebuild is already running');
    }

    await this.auditLogs.append({
      adminId: actor.id,
      action: 'REINDEX',
      entityType: 'SEARCH',
      metadata: {
        indexes: result.indexes,
        startedAt: result.startedAt.toISOString(),
        completedAt: result.completedAt.toISOString(),
        durationMs: result.durationMs,
      },
    });

    return {
      reindexed: true,
      indexes: result.indexes,
      completedAt: result.completedAt.toISOString(),
    };
  }
}
