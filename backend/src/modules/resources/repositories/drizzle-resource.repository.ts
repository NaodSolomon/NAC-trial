import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import * as schema from '../../../database/schema';
import { auditLogs, NewResource, resourceDownloadLogs, resources } from '../../../database/schema';
import {
  ResourceListCriteria,
  ResourceRepository,
} from '../interfaces/resource-repository.interface';

@Injectable()
export class DrizzleResourceRepository implements ResourceRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async list(criteria: ResourceListCriteria) {
    const filters = [
      ...(criteria.languageCode ? [eq(resources.languageCode, criteria.languageCode)] : []),
      ...(criteria.publicOnly ? [eq(resources.status, 'PUBLISHED')] : []),
    ];
    const where = filters.length ? and(...filters) : undefined;
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(resources)
        .where(where)
        .orderBy(desc(resources.createdAt))
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ total: count() }).from(resources).where(where),
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

  async create(data: NewResource, actorId: string) {
    return this.db.transaction(async (transaction) => {
      const [created] = await transaction.insert(resources).values(data).returning();

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'CREATE',
        entityType: 'RESOURCE',
        entityId: created.id,
        metadata: {
          fileName: created.fileName,
          languageCode: created.languageCode,
        },
      });

      return created;
    });
  }

  async publish(id: string, actorId: string) {
    return this.db.transaction(async (transaction) => {
      const [published] = await transaction
        .update(resources)
        .set({ status: 'PUBLISHED', updatedAt: new Date() })
        .where(eq(resources.id, id))
        .returning();
      if (!published) return null;

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'PUBLISH',
        entityType: 'RESOURCE',
        entityId: id,
        metadata: {
          fileName: published.fileName,
          languageCode: published.languageCode,
        },
      });

      return published;
    });
  }

  async recordPublishedDownload(id: string, country: string | null) {
    return this.db.transaction(async (transaction) => {
      const [resource] = await transaction
        .update(resources)
        .set({ downloadCount: sql`${resources.downloadCount} + 1` })
        .where(and(eq(resources.id, id), eq(resources.status, 'PUBLISHED')))
        .returning({
          id: resources.id,
          fileUrl: resources.fileUrl,
          fileName: resources.fileName,
          mimeType: resources.mimeType,
          downloadCount: resources.downloadCount,
        });
      if (!resource) return null;

      await transaction.insert(resourceDownloadLogs).values({
        resourceId: resource.id,
        country,
      });
      return resource;
    });
  }

  async purgeDownloadLogsBefore(cutoff: Date): Promise<void> {
    await this.db
      .delete(resourceDownloadLogs)
      .where(sql`${resourceDownloadLogs.downloadedAt} < ${cutoff}`);
  }

  async delete(id: string, actorId: string) {
    return this.db.transaction(async (transaction) => {
      const [deleted] = await transaction.delete(resources).where(eq(resources.id, id)).returning();
      if (!deleted) return false;

      await transaction.insert(auditLogs).values({
        adminId: actorId,
        action: 'DELETE',
        entityType: 'RESOURCE',
        entityId: id,
        metadata: {
          fileName: deleted.fileName,
          languageCode: deleted.languageCode,
        },
      });

      return true;
    });
  }
}
