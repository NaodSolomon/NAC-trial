import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import {
  admins,
  authSessions,
  auditLogs,
  NewPasswordResetToken,
  passwordResetTokens,
  PasswordResetToken,
} from '../../../database/schema';
import * as schema from '../../../database/schema';
import {
  PasswordResetConsumptionResult,
  PasswordResetRepository,
} from '../interfaces/password-reset-repository.interface';

@Injectable()
export class DrizzlePasswordResetRepository implements PasswordResetRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async createResetToken(token: NewPasswordResetToken): Promise<PasswordResetToken> {
    return this.db.transaction(async (transaction) => {
      // Serialize reset issuance per administrator so concurrent requests cannot
      // leave two usable tokens behind.
      await transaction
        .select({ id: admins.id })
        .from(admins)
        .where(eq(admins.id, token.adminId))
        .for('update');
      await transaction
        .delete(passwordResetTokens)
        .where(
          and(eq(passwordResetTokens.adminId, token.adminId), isNull(passwordResetTokens.usedAt)),
        );
      const [created] = await transaction.insert(passwordResetTokens).values(token).returning();
      return created;
    });
  }

  async consumeResetTokenAndChangePassword(
    tokenHash: string,
    passwordHash: string,
  ): Promise<PasswordResetConsumptionResult> {
    return this.db.transaction(async (transaction) => {
      const now = new Date();
      const [claimed] = await transaction
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, now),
          ),
        )
        .returning({ id: passwordResetTokens.id, adminId: passwordResetTokens.adminId });

      if (!claimed) {
        return { status: 'invalid' };
      }

      const [updatedAdmin] = await transaction
        .update(admins)
        .set({
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: now,
        })
        .where(and(eq(admins.id, claimed.adminId), eq(admins.isActive, true)))
        .returning({ id: admins.id });

      if (!updatedAdmin) {
        return { status: 'invalid' };
      }

      await transaction
        .delete(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.adminId, claimed.adminId),
            ne(passwordResetTokens.id, claimed.id),
            isNull(passwordResetTokens.usedAt),
          ),
        );
      const revokedSessions = await transaction
        .update(authSessions)
        .set({ revokedAt: now })
        .where(and(eq(authSessions.adminId, claimed.adminId), isNull(authSessions.revokedAt)))
        .returning({ id: authSessions.id });

      await transaction.insert(auditLogs).values({
        adminId: claimed.adminId,
        action: 'PASSWORD_RESET',
        entityType: 'ADMIN',
        entityId: claimed.adminId,
        metadata: { revokedSessionCount: revokedSessions.length },
      });

      return {
        status: 'consumed',
        adminId: claimed.adminId,
        revokedSessionCount: revokedSessions.length,
      };
    });
  }

  async invalidateOutstandingTokens(adminId: string): Promise<void> {
    await this.db
      .delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.adminId, adminId), isNull(passwordResetTokens.usedAt)));
  }

  async invalidateResetToken(tokenHash: string): Promise<void> {
    await this.db
      .delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt)));
  }
}
