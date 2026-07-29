import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, isNull, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import { Admin, admins, authSessions, auditLogs, NewAdmin } from '../../../database/schema';
import * as schema from '../../../database/schema';
import { PaginatedResult } from '../../../common/types/api-response.type';
import {
  AdminListCriteria,
  AdminManagementRepository,
  AdminMutationResult,
} from '../interfaces/admin-management-repository.interface';

@Injectable()
export class DrizzleAdminManagementRepository implements AdminManagementRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async list(criteria: AdminListCriteria): Promise<PaginatedResult<Admin>> {
    const filters: SQL[] = [];

    if (criteria.role) {
      filters.push(eq(admins.role, criteria.role));
    }
    if (criteria.isActive !== undefined) {
      filters.push(eq(admins.isActive, criteria.isActive));
    }

    const where = filters.length ? and(...filters) : undefined;
    const sortColumns = {
      email: admins.email,
      name: admins.name,
      role: admins.role,
      createdAt: admins.createdAt,
    };
    const sortColumn = sortColumns[criteria.sortBy as keyof typeof sortColumns] ?? admins.createdAt;
    const order = criteria.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(admins)
        .where(where)
        .orderBy(order)
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ total: count() }).from(admins).where(where),
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

  async create(data: NewAdmin, actorId: string): Promise<Admin> {
    return this.db.transaction(async (transaction) => {
      const [created] = await transaction.insert(admins).values(data).returning();

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'CREATE',
        entityType: 'ADMIN',
        entityId: created.id,
        metadata: {
          email: created.email,
          role: created.role,
        },
      });

      return created;
    });
  }

  async update(id: string, data: Partial<NewAdmin>, actorId: string): Promise<AdminMutationResult> {
    return this.db.transaction(async (transaction) => {
      const [target] = await transaction
        .select()
        .from(admins)
        .where(eq(admins.id, id))
        .for('update');

      if (!target) {
        return { status: 'not_found' };
      }

      const removesSuperAdmin =
        target.role === 'SUPER_ADMIN' &&
        target.isActive &&
        ((data.role !== undefined && data.role !== 'SUPER_ADMIN') || data.isActive === false);

      if (removesSuperAdmin) {
        const activeSuperAdmins = await transaction
          .select({ id: admins.id })
          .from(admins)
          .where(and(eq(admins.role, 'SUPER_ADMIN'), eq(admins.isActive, true)))
          .for('update');

        if (activeSuperAdmins.length <= 1) {
          return { status: 'last_super_admin' };
        }
      }

      const [updated] = await transaction
        .update(admins)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(admins.id, id))
        .returning();

      if (data.passwordHash !== undefined || data.isActive === false) {
        await transaction
          .update(authSessions)
          .set({ revokedAt: new Date() })
          .where(and(eq(authSessions.adminId, id), isNull(authSessions.revokedAt)));
      }

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'UPDATE',
        entityType: 'ADMIN',
        entityId: id,
        metadata: {
          changedFields: Object.keys(data).filter((field) => field !== 'passwordHash'),
          passwordChanged: data.passwordHash !== undefined,
        },
      });

      return { status: 'updated', admin: updated };
    });
  }

  async delete(id: string, actorId: string): Promise<AdminMutationResult> {
    return this.db.transaction(async (transaction) => {
      const [target] = await transaction
        .select()
        .from(admins)
        .where(eq(admins.id, id))
        .for('update');

      if (!target) {
        return { status: 'not_found' };
      }

      if (target.role === 'SUPER_ADMIN' && target.isActive) {
        const activeSuperAdmins = await transaction
          .select({ id: admins.id })
          .from(admins)
          .where(and(eq(admins.role, 'SUPER_ADMIN'), eq(admins.isActive, true)))
          .for('update');

        if (activeSuperAdmins.length <= 1) {
          return { status: 'last_super_admin' };
        }
      }

      await transaction.delete(admins).where(eq(admins.id, id));
      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'DELETE',
        entityType: 'ADMIN',
        entityId: id,
        metadata: {
          email: target.email,
          role: target.role,
        },
      });

      return { status: 'deleted' };
    });
  }
}
