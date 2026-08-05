import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gt, isNotNull, isNull, lte, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PaginatedResult } from '../../../common/types/api-response.type';
import { DRIZZLE } from '../../../database/drizzle.module';
import {
  admins,
  AuthSession,
  authSessions,
  auditLogs,
  NewAuthSession,
} from '../../../database/schema';
import * as schema from '../../../database/schema';
import { AuthSessionRepository } from '../interfaces/auth-session-repository.interface';
import {
  AdminSessionListCriteria,
  AdminSessionRecord,
  AdminSessionStatus,
  SessionRevocationResult,
} from '../interfaces/admin-session.types';

@Injectable()
export class DrizzleAuthSessionRepository implements AuthSessionRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(session: NewAuthSession): Promise<AuthSession> {
    const [created] = await this.db.insert(authSessions).values(session).returning();

    return created;
  }

  async findById(id: string): Promise<AuthSession | null> {
    const [session] = await this.db
      .select()
      .from(authSessions)
      .where(eq(authSessions.id, id))
      .limit(1);

    return session ?? null;
  }

  async rotate(currentSessionId: string, replacement: NewAuthSession): Promise<AuthSession | null> {
    return this.db.transaction(async (transaction) => {
      const [revoked] = await transaction
        .update(authSessions)
        .set({
          revokedAt: new Date(),
          lastUsedAt: new Date(),
        })
        .where(and(eq(authSessions.id, currentSessionId), isNull(authSessions.revokedAt)))
        .returning();

      if (!revoked) {
        return null;
      }

      const [created] = await transaction.insert(authSessions).values(replacement).returning();

      return created;
    });
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      const [revoked] = await transaction
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(authSessions.tokenHash, tokenHash), isNull(authSessions.revokedAt)))
        .returning();

      if (revoked) {
        await transaction.insert(auditLogs).values({
          adminId: revoked.adminId,
          action: 'LOGOUT',
          entityType: 'AUTH_SESSION',
          entityId: revoked.id,
          metadata: {},
        });
      }
    });
  }

  async revokeFamily(tokenFamilyId: string): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.tokenFamilyId, tokenFamilyId), isNull(authSessions.revokedAt)));
  }

  async list(criteria: AdminSessionListCriteria): Promise<PaginatedResult<AdminSessionRecord>> {
    const now = new Date();
    const filters: SQL[] = [];

    if (criteria.adminId) {
      filters.push(eq(authSessions.adminId, criteria.adminId));
    }
    if (criteria.status === 'active') {
      filters.push(isNull(authSessions.revokedAt), gt(authSessions.expiresAt, now));
    } else if (criteria.status === 'revoked') {
      filters.push(isNotNull(authSessions.revokedAt));
    } else if (criteria.status === 'expired') {
      filters.push(isNull(authSessions.revokedAt), lte(authSessions.expiresAt, now));
    }

    const where = filters.length ? and(...filters) : undefined;
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: authSessions.id,
          adminId: admins.id,
          adminName: admins.name,
          adminEmail: admins.email,
          userAgent: authSessions.userAgent,
          ipHash: authSessions.ipHash,
          createdAt: authSessions.createdAt,
          lastUsedAt: authSessions.lastUsedAt,
          expiresAt: authSessions.expiresAt,
          revokedAt: authSessions.revokedAt,
        })
        .from(authSessions)
        .innerJoin(admins, eq(authSessions.adminId, admins.id))
        .where(where)
        .orderBy(desc(authSessions.createdAt))
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ total: count() }).from(authSessions).where(where),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        admin: {
          id: row.adminId,
          name: row.adminName,
          email: row.adminEmail,
        },
        userAgent: row.userAgent,
        ipFingerprint: row.ipHash ? row.ipHash.slice(0, 12) : null,
        createdAt: row.createdAt,
        lastUsedAt: row.lastUsedAt ?? row.createdAt,
        expiresAt: row.expiresAt,
        status: this.resolveStatus(row.revokedAt, row.expiresAt, now),
      })),
      meta: {
        total,
        page: criteria.page,
        limit: criteria.limit,
        totalPages: Math.ceil(total / criteria.limit),
      },
    };
  }

  async revokeSession(sessionId: string, actorId: string): Promise<SessionRevocationResult> {
    return this.db.transaction(async (transaction) => {
      const [existing] = await transaction
        .select({
          id: authSessions.id,
          adminId: authSessions.adminId,
          revokedAt: authSessions.revokedAt,
        })
        .from(authSessions)
        .where(eq(authSessions.id, sessionId))
        .limit(1);

      if (!existing) {
        return 'not_found';
      }
      if (existing.revokedAt) {
        return 'already_revoked';
      }

      const [revoked] = await transaction
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)))
        .returning({ id: authSessions.id });

      if (!revoked) {
        return 'already_revoked';
      }

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'REVOKE',
        entityType: 'AUTH_SESSION',
        entityId: sessionId,
        metadata: { targetAdminId: existing.adminId },
      });

      return 'revoked';
    });
  }

  async revokeAllForAdmin(adminId: string, actorId: string): Promise<number> {
    return this.db.transaction(async (transaction) => {
      const revoked = await transaction
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(authSessions.adminId, adminId), isNull(authSessions.revokedAt)))
        .returning({ id: authSessions.id });

      if (revoked.length) {
        await transaction.insert(auditLogs).values({
          adminId: actorId,
          action: 'REVOKE_ALL',
          entityType: 'AUTH_SESSION',
          entityId: adminId,
          metadata: { targetAdminId: adminId, revokedCount: revoked.length },
        });
      }

      return revoked.length;
    });
  }

  private resolveStatus(revokedAt: Date | null, expiresAt: Date, now: Date): AdminSessionStatus {
    if (revokedAt) return 'REVOKED';
    if (expiresAt <= now) return 'EXPIRED';
    return 'ACTIVE';
  }
}
