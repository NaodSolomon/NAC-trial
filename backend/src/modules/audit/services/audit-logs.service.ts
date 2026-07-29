import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../common/types/api-response.type';
import { AuditLog } from '../../../database/schema';
import { AuditLogQueryDto } from '../dto/audit-log-query.dto';
import {
  AUDIT_LOG_REPOSITORY,
  AuditLogRepository,
} from '../interfaces/audit-log-repository.interface';

@Injectable()
export class AuditLogsService {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogs: AuditLogRepository,
  ) {}

  list(query: AuditLogQueryDto): Promise<PaginatedResult<AuditLog>> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException('The audit-log "from" date must be earlier than the "to" date');
    }

    return this.auditLogs.list({
      page: query.page,
      limit: query.limit,
      offset: query.offset,
      sortOrder: query.sortOrder,
      adminId: query.adminId,
      entityType: query.entityType,
      action: query.action,
      from,
      to,
    });
  }
}
