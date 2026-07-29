import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import * as schema from '../../../database/schema';
import { auditLogs, galleryItems, mediaAssets } from '../../../database/schema';
import { GalleryCriteria, GalleryRepository } from '../interfaces/gallery-repository.interface';

@Injectable()
export class DrizzleGalleryRepository implements GalleryRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async list(criteria: GalleryCriteria) {
    const filters: SQL[] = [eq(galleryItems.languageCode, criteria.languageCode)];
    if (criteria.type) filters.push(eq(mediaAssets.type, criteria.type));
    const where = and(...filters);
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select(this.selection())
        .from(galleryItems)
        .innerJoin(mediaAssets, eq(galleryItems.mediaId, mediaAssets.id))
        .where(where)
        .orderBy(
          criteria.sortOrder === 'asc' ? asc(galleryItems.createdAt) : desc(galleryItems.createdAt),
        )
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db
        .select({ total: count() })
        .from(galleryItems)
        .innerJoin(mediaAssets, eq(galleryItems.mediaId, mediaAssets.id))
        .where(where),
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

  async create(data: Parameters<GalleryRepository['create']>[0], actorId: string) {
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(galleryItems).values(data).returning();
      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'CREATE',
        entityType: 'GALLERY_ITEM',
        entityId: created.id,
        metadata: { mediaId: created.mediaId, languageCode: created.languageCode },
      });
      const [view] = await tx
        .select(this.selection())
        .from(galleryItems)
        .innerJoin(mediaAssets, eq(galleryItems.mediaId, mediaAssets.id))
        .where(eq(galleryItems.id, created.id));
      return view;
    });
  }

  async findById(id: string) {
    const [item] = await this.db
      .select(this.selection())
      .from(galleryItems)
      .innerJoin(mediaAssets, eq(galleryItems.mediaId, mediaAssets.id))
      .where(eq(galleryItems.id, id))
      .limit(1);
    return item ?? null;
  }

  async update(id: string, data: Parameters<GalleryRepository['update']>[1], actorId: string) {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(galleryItems)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(galleryItems.id, id))
        .returning();
      if (!updated) return null;
      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'UPDATE',
        entityType: 'GALLERY_ITEM',
        entityId: updated.id,
        metadata: { changedFields: Object.keys(data) },
      });
      const [view] = await tx
        .select(this.selection())
        .from(galleryItems)
        .innerJoin(mediaAssets, eq(galleryItems.mediaId, mediaAssets.id))
        .where(eq(galleryItems.id, id));
      return view;
    });
  }

  async delete(id: string, actorId: string) {
    return this.db.transaction(async (tx) => {
      const [deleted] = await tx.delete(galleryItems).where(eq(galleryItems.id, id)).returning();
      if (!deleted) return false;
      await tx.delete(mediaAssets).where(eq(mediaAssets.id, deleted.mediaId));
      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'DELETE',
        entityType: 'GALLERY_ITEM',
        entityId: deleted.id,
        metadata: { mediaId: deleted.mediaId, languageCode: deleted.languageCode },
      });
      return true;
    });
  }

  private selection() {
    return {
      id: galleryItems.id,
      mediaId: galleryItems.mediaId,
      title: galleryItems.title,
      altText: galleryItems.altText,
      languageCode: galleryItems.languageCode,
      createdAt: galleryItems.createdAt,
      updatedAt: galleryItems.updatedAt,
      mediaUrl: mediaAssets.publicUrl,
      type: mediaAssets.type,
    };
  }
}
