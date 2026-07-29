import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, sql, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import * as schema from '../../../database/schema';
import {
  auditLogs,
  donations,
  notificationOutbox,
  paymentWebhookEvents,
} from '../../../database/schema';
import { DonationCriteria, DonationRepository } from '../interfaces/donation-repository.interface';

@Injectable()
export class DrizzleDonationRepository implements DonationRepository {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>) {}

  async create(data: Parameters<DonationRepository['create']>[0]) {
    const [row] = await this.db.insert(donations).values(data).returning();
    return row;
  }
  async attachOrder(id: string, providerOrderId: string) {
    const [row] = await this.db
      .update(donations)
      .set({ providerOrderId, status: 'PENDING', updatedAt: new Date() })
      .where(eq(donations.id, id))
      .returning();
    return row;
  }
  async findById(id: string) {
    const [row] = await this.db.select().from(donations).where(eq(donations.id, id)).limit(1);
    return row ?? null;
  }
  async list(criteria: DonationCriteria) {
    const filters: SQL[] = [];
    if (criteria.status) filters.push(eq(donations.status, criteria.status));
    if (criteria.currency) filters.push(eq(donations.currency, criteria.currency));
    if (criteria.gateway) filters.push(eq(donations.gateway, criteria.gateway));
    const where = filters.length ? and(...filters) : undefined;
    const order =
      criteria.sortOrder === 'asc' ? asc(donations.createdAt) : desc(donations.createdAt);
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(donations)
        .where(where)
        .orderBy(order)
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ total: count() }).from(donations).where(where),
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
  recent(limit: number) {
    return this.db
      .select()
      .from(donations)
      .where(eq(donations.status, 'CONFIRMED'))
      .orderBy(desc(donations.confirmedAt))
      .limit(limit);
  }
  async cancel(id: string) {
    const [row] = await this.db
      .update(donations)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(and(eq(donations.id, id), inArray(donations.status, ['INITIATED', 'PENDING'])))
      .returning();
    return row ?? null;
  }
  async verify(id: string, actorId: string) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(donations)
        .set({ status: 'CONFIRMED', confirmedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(donations.id, id), inArray(donations.status, ['INITIATED', 'PENDING'])))
        .returning();
      if (!row) return null;
      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'VERIFY',
        entityType: 'DONATION',
        entityId: row.id,
        metadata: { currency: row.currency, amount: row.amount, gateway: row.gateway },
      });
      return row;
    });
  }
  async applyWebhook(event: Parameters<DonationRepository['applyWebhook']>[0]) {
    return this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(paymentWebhookEvents)
        .values({ gateway: 'PAYPAL', providerEventId: event.eventId, eventType: event.eventType })
        .onConflictDoNothing()
        .returning();
      if (!inserted.length) return false;
      await tx
        .update(donations)
        .set({
          status: event.status,
          externalTransactionId: event.transactionId,
          confirmedAt: event.status === 'CONFIRMED' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(donations.gateway, 'PAYPAL'),
            eq(donations.providerOrderId, event.providerOrderId),
            inArray(donations.status, ['INITIATED', 'PENDING']),
          ),
        );
      return true;
    });
  }
  async stats() {
    const rows = await this.db
      .select({
        currency: donations.currency,
        amount: sql<string>`coalesce(sum(${donations.amount}), 0)`,
        total: count(),
      })
      .from(donations)
      .where(eq(donations.status, 'CONFIRMED'))
      .groupBy(donations.currency);
    return {
      totalDonations: rows.reduce((sum, row) => sum + row.total, 0),
      totals: rows.map(({ currency, amount }) => ({ currency, amount })),
    };
  }
  async saveReceipt(id: string, url: string) {
    await this.db
      .update(donations)
      .set({ receiptUrl: url, updatedAt: new Date() })
      .where(eq(donations.id, id));
  }
  async enqueueReceipt(id: string, actorId: string) {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(notificationOutbox)
        .values({ type: 'DONATION_RECEIPT_EMAIL', payload: { donationId: id } });
      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'ENQUEUE_RECEIPT',
        entityType: 'DONATION',
        entityId: id,
        metadata: {},
      });
    });
  }
}
