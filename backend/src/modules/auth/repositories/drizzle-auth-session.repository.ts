import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import { AuthSession, authSessions, NewAuthSession } from '../../../database/schema';
import * as schema from '../../../database/schema';
import { AuthSessionRepository } from '../interfaces/auth-session-repository.interface';

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
    await this.db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.tokenHash, tokenHash), isNull(authSessions.revokedAt)));
  }

  async revokeFamily(tokenFamilyId: string): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.tokenFamilyId, tokenFamilyId), isNull(authSessions.revokedAt)));
  }
}
