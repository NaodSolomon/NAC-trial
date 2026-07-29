import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, or, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import * as schema from '../../../database/schema';
import {
  auditLogs,
  newsletterSubscribers,
  testimonials,
  volunteerApplications,
} from '../../../database/schema';
import {
  EngagementRepository,
  ListCriteria,
  TestimonialCriteria,
  VolunteerCriteria,
} from '../interfaces/engagement-repository.interface';

@Injectable()
export class DrizzleEngagementRepository implements EngagementRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async createApplication(data: Parameters<EngagementRepository['createApplication']>[0]) {
    const [created] = await this.db.insert(volunteerApplications).values(data).returning();
    return created;
  }

  async listApplications(criteria: VolunteerCriteria) {
    const filters: SQL[] = [];
    if (criteria.status) filters.push(eq(volunteerApplications.status, criteria.status));
    if (criteria.languageCode) {
      filters.push(eq(volunteerApplications.languageCode, criteria.languageCode));
    }
    if (criteria.search) {
      const pattern = `%${criteria.search}%`;
      const search = or(
        ilike(volunteerApplications.name, pattern),
        ilike(volunteerApplications.email, pattern),
        ilike(volunteerApplications.roleInterest, pattern),
      );
      if (search) filters.push(search);
    }
    const where = filters.length ? and(...filters) : undefined;
    const order =
      criteria.sortOrder === 'asc'
        ? asc(volunteerApplications.createdAt)
        : desc(volunteerApplications.createdAt);
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(volunteerApplications)
        .where(where)
        .orderBy(order)
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ total: count() }).from(volunteerApplications).where(where),
    ]);
    return this.result(data, total, criteria);
  }

  async deleteApplication(id: string, actorId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(volunteerApplications)
        .where(eq(volunteerApplications.id, id))
        .returning();
      if (!deleted) return false;
      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'DELETE',
        entityType: 'VOLUNTEER_APPLICATION',
        entityId: deleted.id,
        metadata: {
          status: deleted.status,
          languageCode: deleted.languageCode,
          submittedAt: deleted.createdAt.toISOString(),
        },
      });
      return true;
    });
  }

  async listTestimonials(criteria: TestimonialCriteria, publicOnly: boolean) {
    const filters: SQL[] = [eq(testimonials.languageCode, criteria.languageCode)];
    if (publicOnly) {
      filters.push(eq(testimonials.status, 'PUBLISHED'));
    } else if (criteria.status) {
      filters.push(eq(testimonials.status, criteria.status));
    }
    const where = and(...filters);
    const order =
      criteria.sortOrder === 'asc' ? asc(testimonials.createdAt) : desc(testimonials.createdAt);
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(testimonials)
        .where(where)
        .orderBy(order)
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ total: count() }).from(testimonials).where(where),
    ]);
    return this.result(data, total, criteria);
  }

  async createTestimonial(
    data: Parameters<EngagementRepository['createTestimonial']>[0],
    actorId: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(testimonials).values(data).returning();
      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'CREATE',
        entityType: 'TESTIMONIAL',
        entityId: created.id,
        metadata: {
          languageCode: created.languageCode,
          status: created.status,
        },
      });
      return created;
    });
  }

  async updateTestimonial(
    id: string,
    data: Parameters<EngagementRepository['updateTestimonial']>[1],
    actorId: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(testimonials)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(testimonials.id, id))
        .returning();
      if (!updated) return null;
      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'UPDATE',
        entityType: 'TESTIMONIAL',
        entityId: updated.id,
        metadata: {
          changedFields: Object.keys(data),
          status: updated.status,
        },
      });
      return updated;
    });
  }

  async deleteTestimonial(id: string, actorId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [deleted] = await tx.delete(testimonials).where(eq(testimonials.id, id)).returning();
      if (!deleted) return false;
      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'DELETE',
        entityType: 'TESTIMONIAL',
        entityId: deleted.id,
        metadata: {
          languageCode: deleted.languageCode,
          status: deleted.status,
        },
      });
      return true;
    });
  }

  async createSubscriber(data: Parameters<EngagementRepository['createSubscriber']>[0]) {
    const [created] = await this.db.insert(newsletterSubscribers).values(data).returning();
    return created;
  }

  async listSubscribers(criteria: ListCriteria) {
    const order =
      criteria.sortOrder === 'asc'
        ? asc(newsletterSubscribers.createdAt)
        : desc(newsletterSubscribers.createdAt);
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(newsletterSubscribers)
        .orderBy(order)
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ total: count() }).from(newsletterSubscribers),
    ]);
    return this.result(data, total, criteria);
  }

  async deleteSubscriber(email: string, actorId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, email))
        .returning();
      if (!deleted) return false;
      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'DELETE',
        entityType: 'NEWSLETTER_SUBSCRIBER',
        entityId: deleted.id,
        metadata: {
          languageCode: deleted.languageCode,
          subscribedAt: deleted.createdAt.toISOString(),
        },
      });
      return true;
    });
  }

  private result<T>(data: T[], total: number, criteria: ListCriteria) {
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
