import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import { auditLogs, NewSiteSetting, SiteSetting, siteSettings } from '../../../database/schema';
import * as schema from '../../../database/schema';
import { SiteSettingsRepository } from '../interfaces/site-settings-repository.interface';

@Injectable()
export class DrizzleSiteSettingsRepository implements SiteSettingsRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async get(): Promise<SiteSetting | null> {
    const [settings] = await this.db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'global'))
      .limit(1);

    return settings ?? null;
  }

  async update(data: Partial<NewSiteSetting>, actorId: string): Promise<SiteSetting | null> {
    return this.db.transaction(async (transaction) => {
      const [updated] = await transaction
        .update(siteSettings)
        .set({
          ...data,
          updatedBy: actorId,
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.key, 'global'))
        .returning();

      if (!updated) {
        return null;
      }

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'UPDATE',
        entityType: 'SITE_SETTINGS',
        entityId: updated.id,
        metadata: { changedFields: Object.keys(data) },
      });

      return updated;
    });
  }
}
