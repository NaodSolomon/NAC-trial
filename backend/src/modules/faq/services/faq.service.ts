import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Faq } from '../../../database/schema';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { ApplicationCache, CACHE, NOOP_CACHE } from '../../cache/cache.interface';
import { CreateFaqDto, FaqQueryDto, ReorderFaqDto, UpdateFaqDto } from '../dto/faq.dto';
import { FAQ_REPOSITORY, FaqRepository } from '../interfaces/faq-repository.interface';

@Injectable()
export class FaqService {
  constructor(
    @Inject(FAQ_REPOSITORY) private readonly faqs: FaqRepository,
    @Inject(CACHE) private readonly cache: ApplicationCache = NOOP_CACHE,
  ) {}

  async listPublic(languageCode: 'en' | 'am', category?: string) {
    const key = category ? `${languageCode}:${category}` : languageCode;
    const items = await this.cache.remember('faq', key, 300, () =>
      this.faqs.listPublished(languageCode, category),
    );

    return {
      languageCode,
      items: items.map((item) => this.toPublicView(item)),
    };
  }

  categories(languageCode: 'en' | 'am') {
    return this.cache.remember('faq', `categories:${languageCode}`, 300, () =>
      this.faqs.listCategories(languageCode),
    );
  }

  list(query: FaqQueryDto) {
    return this.faqs.list({
      page: query.page,
      limit: query.limit,
      offset: query.offset,
      sortOrder: query.sortOrder,
      languageCode: query.languageCode,
      status: query.status,
      category: query.category,
    });
  }

  async findOne(id: string): Promise<Faq> {
    const faq = await this.faqs.findById(id);
    if (!faq) throw new NotFoundException(`FAQ ${id} was not found`);
    return faq;
  }

  async create(dto: CreateFaqDto, actor: AdminPrincipal): Promise<Faq> {
    try {
      const created = await this.faqs.create(
        {
          translationKey: dto.translationKey.trim(),
          languageCode: dto.languageCode,
          question: dto.question.trim(),
          answer: dto.answer.trim(),
          category: dto.category?.trim() || null,
          sortOrder: await this.faqs.nextSortOrder(dto.languageCode),
          createdBy: actor.id,
        },
        actor.id,
      );
      await this.cache.invalidate('faq');
      return created;
    } catch (error: unknown) {
      this.rethrowUniqueViolation(error);
    }
  }

  async update(id: string, dto: UpdateFaqDto, actor: AdminPrincipal): Promise<Faq> {
    if (!Object.keys(dto).length) {
      throw new BadRequestException('At least one field must be provided');
    }

    const updated = await this.faqs.update(
      id,
      {
        ...(dto.question !== undefined && { question: dto.question.trim() }),
        ...(dto.answer !== undefined && { answer: dto.answer.trim() }),
        ...(dto.category !== undefined && { category: dto.category.trim() || null }),
      },
      actor.id,
    );

    if (!updated) throw new NotFoundException(`FAQ ${id} was not found`);
    await this.cache.invalidate('faq');
    return updated;
  }

  async publish(id: string, actor: AdminPrincipal): Promise<Faq> {
    const published = await this.faqs.publish(id, actor.id);
    if (!published) throw new NotFoundException(`FAQ ${id} was not found`);
    await this.cache.invalidate('faq');
    return published;
  }

  async unpublish(id: string, actor: AdminPrincipal): Promise<Faq> {
    const drafted = await this.faqs.unpublish(id, actor.id);
    if (!drafted) throw new NotFoundException(`FAQ ${id} was not found`);
    await this.cache.invalidate('faq');
    return drafted;
  }

  async reorder(dto: ReorderFaqDto, actor: AdminPrincipal): Promise<{ reordered: number }> {
    const identifiers = new Set(dto.entries.map((entry) => entry.id));
    if (identifiers.size !== dto.entries.length) {
      throw new BadRequestException('Each FAQ may appear only once in a reorder request');
    }

    const reordered = await this.faqs.reorder(dto.entries, actor.id);
    if (!reordered) throw new NotFoundException('No matching FAQ entries were found');
    await this.cache.invalidate('faq');
    return { reordered };
  }

  async delete(id: string, actor: AdminPrincipal): Promise<{ message: string }> {
    if (!(await this.faqs.delete(id, actor.id))) {
      throw new NotFoundException(`FAQ ${id} was not found`);
    }
    await this.cache.invalidate('faq');
    return { message: 'FAQ deleted successfully' };
  }

  private toPublicView(faq: Faq) {
    return {
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
    };
  }

  private rethrowUniqueViolation(error: unknown): never {
    if (this.isUniqueViolation(error)) {
      throw new ConflictException('This FAQ translation already exists for the selected language');
    }
    throw error;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    if ('code' in error && error.code === '23505') return true;
    return (
      'cause' in error &&
      typeof error.cause === 'object' &&
      error.cause !== null &&
      'code' in error.cause &&
      error.cause.code === '23505'
    );
  }
}
