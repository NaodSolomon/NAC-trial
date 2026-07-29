import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import { Admin, admins, auditLogs } from '../../../database/schema';
import * as schema from '../../../database/schema';
import { AdminRepository } from '../interfaces/admin-repository.interface';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

@Injectable()
export class DrizzleAdminRepository implements AdminRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findById(id: string): Promise<Admin | null> {
    const [admin] = await this.db.select().from(admins).where(eq(admins.id, id)).limit(1);

    return admin ?? null;
  }

  async findByEmail(email: string): Promise<Admin | null> {
    const [admin] = await this.db
      .select()
      .from(admins)
      .where(sql`lower(${admins.email}) = ${email.toLowerCase()}`)
      .limit(1);

    return admin ?? null;
  }

  async recordFailedLogin(id: string): Promise<void> {
    await this.db
      .update(admins)
      .set({
        failedLoginAttempts: sql`${admins.failedLoginAttempts} + 1`,
        lockedUntil: sql`
          CASE
            WHEN ${admins.failedLoginAttempts} + 1 >= ${MAX_FAILED_LOGIN_ATTEMPTS}
            THEN now() + (${LOCK_DURATION_MINUTES} * interval '1 minute')
            ELSE ${admins.lockedUntil}
          END
        `,
        updatedAt: new Date(),
      })
      .where(and(eq(admins.id, id), eq(admins.isActive, true)));
  }

  async recordSuccessfulLogin(id: string): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await transaction
        .update(admins)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(admins.id, id));

      await transaction.insert(auditLogs).values({
        adminId: id,
        action: 'LOGIN',
        entityType: 'AUTH_SESSION',
        metadata: {},
      });
    });
  }
}
