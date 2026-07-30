import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../database/drizzle.module';
import * as schema from '../../database/schema';
import { resources } from '../../database/schema';
import { AdminPrincipal } from '../auth/interfaces/auth.types';
import { ApplicationCache, CACHE } from '../cache/cache.interface';
import { CreateResourceDto, ResourceQueryDto } from './resources.dto';

@Injectable()
export class ResourcesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(CACHE) private readonly cache: ApplicationCache,
  ) {}

  listPublic(query: ResourceQueryDto) {
    return this.cache.remember('resources', JSON.stringify(query), 120, () => this.list(query, true));
  }
  listAdmin(query: ResourceQueryDto) { return this.list(query, false); }

  async create(dto: CreateResourceDto, actor: AdminPrincipal) {
    const [row] = await this.db.insert(resources).values({ ...dto, createdBy: actor.id }).returning();
    await this.cache.invalidate('resources');
    return row;
  }
  async publish(id: string) {
    const [row] = await this.db.update(resources).set({ status: 'PUBLISHED', updatedAt: new Date() }).where(eq(resources.id, id)).returning();
    if (!row) throw new NotFoundException('Resource was not found');
    await this.cache.invalidate('resources');
    return row;
  }
  async download(id: string) {
    const [row] = await this.db.update(resources).set({ downloadCount: sql`${resources.downloadCount} + 1` }).where(and(eq(resources.id, id), eq(resources.status, 'PUBLISHED'))).returning({
      id: resources.id, fileUrl: resources.fileUrl, fileName: resources.fileName, mimeType: resources.mimeType, downloadCount: resources.downloadCount,
    });
    if (!row) throw new NotFoundException('Published resource was not found');
    await this.cache.invalidate('resources');
    return row;
  }
  async delete(id: string) {
    const rows = await this.db.delete(resources).where(eq(resources.id, id)).returning({ id: resources.id });
    if (!rows.length) throw new NotFoundException('Resource was not found');
    await this.cache.invalidate('resources');
    return { deleted: true };
  }
  private async list(query: ResourceQueryDto, publicOnly: boolean) {
    const filters = [
      ...(query.languageCode ? [eq(resources.languageCode, query.languageCode)] : []),
      ...(publicOnly ? [eq(resources.status, 'PUBLISHED')] : []),
    ];
    const where = filters.length ? and(...filters) : undefined;
    const [data, [{ total }]] = await Promise.all([
      this.db.select().from(resources).where(where).orderBy(desc(resources.createdAt)).limit(query.limit).offset(query.offset),
      this.db.select({ total: count() }).from(resources).where(where),
    ]);
    return { data, meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) } };
  }
}
