import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, or, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/drizzle.module';
import * as schema from '../../../database/schema';
import { auditLogs, contactSubmissions, NewContactSubmission } from '../../../database/schema';
import { ContactListCriteria, ContactRepository } from '../interfaces/contact-repository.interface';

@Injectable()
export class DrizzleContactRepository implements ContactRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(data: NewContactSubmission) {
    const [created] = await this.db.insert(contactSubmissions).values(data).returning();
    return created;
  }

  async list(criteria: ContactListCriteria) {
    const filters: SQL[] = [];
    if (criteria.languageCode) {
      filters.push(eq(contactSubmissions.languageCode, criteria.languageCode));
    }
    if (criteria.search) {
      const pattern = `%${criteria.search}%`;
      const search = or(
        ilike(contactSubmissions.name, pattern),
        ilike(contactSubmissions.email, pattern),
        ilike(contactSubmissions.subject, pattern),
      );
      if (search) filters.push(search);
    }
    const where = filters.length ? and(...filters) : undefined;
    const order =
      criteria.sortOrder === 'asc'
        ? asc(contactSubmissions.createdAt)
        : desc(contactSubmissions.createdAt);
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(contactSubmissions)
        .where(where)
        .orderBy(order)
        .limit(criteria.limit)
        .offset(criteria.offset),
      this.db.select({ total: count() }).from(contactSubmissions).where(where),
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

  async delete(id: string, actorId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(contactSubmissions)
        .where(eq(contactSubmissions.id, id))
        .returning();
      if (!deleted) return false;

      await tx.insert(auditLogs).values({
        adminId: actorId,
        action: 'DELETE',
        entityType: 'CONTACT_SUBMISSION',
        entityId: deleted.id,
        metadata: {
          languageCode: deleted.languageCode,
          submittedAt: deleted.createdAt.toISOString(),
        },
      });
      return true;
    });
  }
}
