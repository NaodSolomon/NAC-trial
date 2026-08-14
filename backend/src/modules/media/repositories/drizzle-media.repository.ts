import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import * as schema from '../../../database/schema';
import {
  auditLogs,
  mediaAssets,
  mediaTranslations,
  storageDeletionOutbox,
} from '../../../database/schema';
import {
  MediaListCriteria,
  MediaRepository,
  MediaAssetView,
} from '../interfaces/media-repository.interface';

@Injectable()
export class DrizzleMediaRepository implements MediaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async list(criteria: MediaListCriteria) {
    const filters: SQL[] = [];
    if (criteria.type) filters.push(eq(mediaAssets.type, criteria.type));
    if (criteria.search) filters.push(ilike(mediaAssets.originalName, `%${criteria.search}%`));
    const where = filters.length ? and(...filters) : undefined;

    const [assets, totalRows] = await Promise.all([
      this.db
        .select()
        .from(mediaAssets)
        .where(where)
        .orderBy(
          criteria.sortOrder === 'asc' ? asc(mediaAssets.createdAt) : desc(mediaAssets.createdAt),
        )
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ value: count() }).from(mediaAssets).where(where),
    ]);

    const translations = assets.length
      ? await this.db
          .select()
          .from(mediaTranslations)
          .where(
            inArray(
              mediaTranslations.mediaId,
              assets.map((asset) => asset.id),
            ),
          )
      : [];

    return {
      data: assets.map((asset) => ({
        ...asset,
        translations: translations.filter((translation) => translation.mediaId === asset.id),
      })),
      meta: {
        total: totalRows[0].value,
        page: criteria.page,
        limit: criteria.limit,
        totalPages: Math.ceil(totalRows[0].value / criteria.limit),
      },
    };
  }

  async create(
    asset: Parameters<MediaRepository['create']>[0],
    translation: Parameters<MediaRepository['create']>[1],
    actorId: string,
  ): Promise<MediaAssetView> {
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(mediaAssets).values(asset).returning();
      const createdTranslations = translation
        ? await tx
            .insert(mediaTranslations)
            .values({ ...translation, mediaId: created.id })
            .returning()
        : [];
      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'CREATE',
        entityType: 'MEDIA_ASSET',
        entityId: created.id,
        metadata: {
          objectKey: created.objectKey,
          mimeType: created.mimeType,
          sizeBytes: created.sizeBytes,
        },
      });
      return { ...created, translations: createdTranslations };
    });
  }

  async findById(id: string) {
    const [asset] = await this.db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
    return asset ?? null;
  }

  async deleteAndEnqueueStorageCleanup(id: string, actorId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [deleted] = await tx.delete(mediaAssets).where(eq(mediaAssets.id, id)).returning();
      if (!deleted) return false;
      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'DELETE',
        entityType: 'MEDIA_ASSET',
        entityId: deleted.id,
        metadata: {
          objectKey: deleted.objectKey,
          originalName: deleted.originalName,
        },
      });
      await tx.insert(storageDeletionOutbox).values({ objectKey: deleted.objectKey });
      return true;
    });
  }
}
