import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, gte, lte, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PaginatedResult } from '../../../common/types/api-response.type';
import { DRIZZLE } from '../../../database/drizzle.module';
import { AuditLog, auditLogs } from '../../../database/schema';
import * as schema from '../../../database/schema';
import {
  AppendAuditEvent,
  AuditLogCriteria,
  AuditLogRepository,
} from '../interfaces/audit-log-repository.interface';

@Injectable()
export class DrizzleAuditLogRepository implements AuditLogRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async append(event: AppendAuditEvent): Promise<AuditLog> {
    const [auditLog] = await this.db
      .insert(auditLogs)
      .values({
        adminId: event.adminId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: event.metadata ?? {},
      })
      .returning();

    return auditLog;
  }

  async list(criteria: AuditLogCriteria): Promise<PaginatedResult<AuditLog>> {
    const filters: SQL[] = [];

    if (criteria.adminId) {
      filters.push(eq(auditLogs.adminId, criteria.adminId));
    }
    if (criteria.entityType) {
      filters.push(eq(auditLogs.entityType, criteria.entityType.toUpperCase()));
    }
    if (criteria.action) {
      filters.push(eq(auditLogs.action, criteria.action.toUpperCase()));
    }
    if (criteria.from) {
      filters.push(gte(auditLogs.createdAt, criteria.from));
    }
    if (criteria.to) {
      filters.push(lte(auditLogs.createdAt, criteria.to));
    }

    const where = filters.length ? and(...filters) : undefined;
    const order =
      criteria.sortOrder === 'asc' ? asc(auditLogs.createdAt) : desc(auditLogs.createdAt);
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(order)
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ total: count() }).from(auditLogs).where(where),
    ]);

    return {
      data,
      meta: {
        total,
        page: criteria.page,
        limit: criteria.limit,
        totalPages: Math.ceil(total / criteria.limit),
      },
    };
  }
}
