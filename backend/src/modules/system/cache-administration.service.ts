import { Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_LOG_REPOSITORY,
  AuditLogRepository,
} from '../audit/interfaces/audit-log-repository.interface';
import { ApplicationCache, CACHE } from '../cache/cache.interface';
import { AdminPrincipal } from '../auth/interfaces/auth.types';
import { CacheWarmService } from './cache-warm.service';

@Injectable()
export class CacheAdministrationService {
  constructor(
    @Inject(CACHE) private readonly cache: ApplicationCache,
    private readonly warmer: CacheWarmService,
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async clear(actor: AdminPrincipal): Promise<{ cleared: true }> {
    await this.cache.clear();
    await this.auditLogs.append({
      adminId: actor.id,
      action: 'CLEAR',
      entityType: 'CACHE',
      metadata: { scope: 'all-public-cache-namespaces' },
    });

    return { cleared: true };
  }

  async warm(actor: AdminPrincipal): Promise<{ warmed: string[] }> {
    const result = await this.warmer.warm();
    await this.auditLogs.append({
      adminId: actor.id,
      action: 'WARM',
      entityType: 'CACHE',
      metadata: { keys: result.warmed },
    });

    return result;
  }
}
