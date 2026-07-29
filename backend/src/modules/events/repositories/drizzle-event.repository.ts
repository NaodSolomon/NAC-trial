import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, gt, lt, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import * as schema from '../../../database/schema';
import { auditLogs, eventRsvps, events } from '../../../database/schema';
import { EventCriteria, EventRepository } from '../interfaces/event-repository.interface';

@Injectable()
export class DrizzleEventRepository implements EventRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async list(criteria: EventCriteria, publicOnly: boolean) {
    const filters: SQL[] = [];
    if (criteria.languageCode) filters.push(eq(events.languageCode, criteria.languageCode));
    if (publicOnly) filters.push(eq(events.status, 'PUBLISHED'));
    else if (criteria.status) filters.push(eq(events.status, criteria.status));
    const now = new Date();
    if (criteria.timeframe === 'upcoming') filters.push(gt(events.endDate, now));
    if (criteria.timeframe === 'past') filters.push(lt(events.endDate, now));
    const where = filters.length ? and(...filters) : undefined;
    const order = criteria.sortOrder === 'asc' ? asc(events.startDate) : desc(events.startDate);
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(events)
        .where(where)
        .orderBy(order)
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ total: count() }).from(events).where(where),
    ]);
    return this.result(data, total, criteria);
  }

  async findPublicBySlug(slug: string, languageCode: 'en' | 'am') {
    const [event] = await this.db
      .select()
      .from(events)
      .where(
        and(
          eq(events.slug, slug),
          eq(events.languageCode, languageCode),
          eq(events.status, 'PUBLISHED'),
        ),
      )
      .limit(1);
    return event ?? null;
  }

  async findById(id: string) {
    const [event] = await this.db.select().from(events).where(eq(events.id, id)).limit(1);
    return event ?? null;
  }

  async create(data: Parameters<EventRepository['create']>[0], actorId: string) {
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(events).values(data).returning();
      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'CREATE',
        entityType: 'EVENT',
        entityId: created.id,
        metadata: { languageCode: created.languageCode, status: created.status },
      });
      return created;
    });
  }

  async update(id: string, data: Parameters<EventRepository['update']>[1], actorId: string) {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(events)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(events.id, id))
        .returning();
      if (!updated) return null;
      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'UPDATE',
        entityType: 'EVENT',
        entityId: updated.id,
        metadata: { changedFields: Object.keys(data), status: updated.status },
      });
      return updated;
    });
  }

  async delete(id: string, actorId: string) {
    return this.db.transaction(async (tx) => {
      const [deleted] = await tx.delete(events).where(eq(events.id, id)).returning();
      if (!deleted) return false;
      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'DELETE',
        entityType: 'EVENT',
        entityId: deleted.id,
        metadata: { languageCode: deleted.languageCode, status: deleted.status },
      });
      return true;
    });
  }

  async createRsvp(data: Parameters<EventRepository['createRsvp']>[0]) {
    const [created] = await this.db.insert(eventRsvps).values(data).returning();
    return created;
  }

  async listRsvps(eventId: string, criteria: EventCriteria) {
    const where = eq(eventRsvps.eventId, eventId);
    const order =
      criteria.sortOrder === 'asc' ? asc(eventRsvps.createdAt) : desc(eventRsvps.createdAt);
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(eventRsvps)
        .where(where)
        .orderBy(order)
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ total: count() }).from(eventRsvps).where(where),
    ]);
    return this.result(data, total, criteria);
  }

  allRsvps(eventId: string) {
    return this.db
      .select()
      .from(eventRsvps)
      .where(eq(eventRsvps.eventId, eventId))
      .orderBy(asc(eventRsvps.createdAt));
  }

  private result<T>(data: T[], total: number, criteria: EventCriteria) {
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
}
