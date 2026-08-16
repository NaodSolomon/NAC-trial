import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Faq } from '../../../database/schema';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { ApplicationCache } from '../../cache/cache.interface';
import { FaqRepository } from '../interfaces/faq-repository.interface';
import { FaqService } from './faq.service';

const actor: AdminPrincipal = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  name: 'Editor',
  email: 'editor@example.org',
  role: 'CONTENT_EDITOR',
};

function faqWith(overrides: Partial<Faq> = {}): Faq {
  return {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    languageCode: 'en',
    translationKey: 'what-does-the-center-do',
    category: 'Services',
    question: 'What does the center do?',
    answer: 'We support autistic children and their families.',
    status: 'PUBLISHED',
    sortOrder: 0,
    createdBy: actor.id,
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as Faq;
}

describe('FaqService', () => {
  let faqs: jest.Mocked<FaqRepository>;
  let cache: jest.Mocked<ApplicationCache>;
  let service: FaqService;

  beforeEach(() => {
    faqs = {
      listPublished: jest.fn(),
      listCategories: jest.fn(),
      list: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      publish: jest.fn(),
      unpublish: jest.fn(),
      reorder: jest.fn(),
      delete: jest.fn(),
      nextSortOrder: jest.fn().mockResolvedValue(3),
    } as unknown as jest.Mocked<FaqRepository>;
    cache = {
      remember: jest.fn(async (_ns, _key, _ttl, loader: () => unknown) => loader()),
      invalidate: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<ApplicationCache>;
    service = new FaqService(faqs, cache);
  });

  describe('public reads', () => {
    it('exposes only presentation fields, never authorship or status', async () => {
      faqs.listPublished.mockResolvedValue([faqWith()]);

      const result = await service.listPublic('en');

      expect(result).toEqual({
        languageCode: 'en',
        items: [
          {
            id: faqWith().id,
            question: 'What does the center do?',
            answer: 'We support autistic children and their families.',
            category: 'Services',
          },
        ],
      });
      expect(result.items[0]).not.toHaveProperty('createdBy');
      expect(result.items[0]).not.toHaveProperty('status');
    });

    it('caches each language and category combination separately', async () => {
      faqs.listPublished.mockResolvedValue([]);

      await service.listPublic('am', 'Services');

      expect(cache.remember).toHaveBeenCalledWith(
        'faq',
        'am:Services',
        300,
        expect.any(Function),
      );
    });

    it('caches an uncategorised listing under the language alone', async () => {
      faqs.listPublished.mockResolvedValue([]);

      await service.listPublic('en');

      expect(cache.remember).toHaveBeenCalledWith('faq', 'en', 300, expect.any(Function));
    });

    it('lists published categories', async () => {
      faqs.listCategories.mockResolvedValue(['Services', 'Visiting']);

      await expect(service.categories('en')).resolves.toEqual(['Services', 'Visiting']);
    });
  });

  describe('create', () => {
    const dto = {
      translationKey: '  what-does-the-center-do  ',
      languageCode: 'en' as const,
      question: '  What does the center do?  ',
      answer: '  We support families.  ',
      category: '  Services  ',
    };

    it('trims every field and appends the entry to the end of the order', async () => {
      faqs.create.mockResolvedValue(faqWith());

      await service.create(dto, actor);

      expect(faqs.create).toHaveBeenCalledWith(
        {
          translationKey: 'what-does-the-center-do',
          languageCode: 'en',
          question: 'What does the center do?',
          answer: 'We support families.',
          category: 'Services',
          sortOrder: 3,
          createdBy: actor.id,
        },
        actor.id,
      );
      expect(cache.invalidate).toHaveBeenCalledWith('faq');
    });

    it('stores a blank category as null', async () => {
      faqs.create.mockResolvedValue(faqWith());

      await service.create({ ...dto, category: '   ' }, actor);

      expect(faqs.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: null }),
        actor.id,
      );
    });

    it('stores an absent category as null', async () => {
      faqs.create.mockResolvedValue(faqWith());

      await service.create({ ...dto, category: undefined }, actor);

      expect(faqs.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: null }),
        actor.id,
      );
    });

    it.each([
      ['a direct code', { code: '23505' }],
      ['a wrapped code', { cause: { code: '23505' } }],
    ])('reports %s as a duplicate translation', async (_label, rejection) => {
      faqs.create.mockRejectedValue(rejection);

      await expect(service.create(dto, actor)).rejects.toBeInstanceOf(ConflictException);
    });

    it.each([
      ['a plain error', new Error('offline')],
      ['a null rejection', null],
      ['an unrelated code', { code: '42P01' }],
      ['a non-object cause', { cause: 'nope' }],
      ['a cause without a code', { cause: {} }],
    ])('rethrows %s untouched', async (_label, rejection) => {
      faqs.create.mockRejectedValue(rejection);

      await expect(service.create(dto, actor)).rejects.not.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('refuses an empty payload', async () => {
      await expect(service.update('id', {}, actor)).rejects.toBeInstanceOf(BadRequestException);
      expect(faqs.update).not.toHaveBeenCalled();
    });

    it('forwards only the supplied fields', async () => {
      faqs.update.mockResolvedValue(faqWith());

      await service.update('id', { question: '  Updated?  ' }, actor);

      expect(faqs.update).toHaveBeenCalledWith('id', { question: 'Updated?' }, actor.id);
    });

    it('clears a category when given only whitespace', async () => {
      faqs.update.mockResolvedValue(faqWith());

      await service.update('id', { category: '  ' }, actor);

      expect(faqs.update).toHaveBeenCalledWith('id', { category: null }, actor.id);
    });

    it('reports a missing entry', async () => {
      faqs.update.mockResolvedValue(null);

      await expect(service.update('id', { question: 'x' }, actor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('publication', () => {
    it('publishes and invalidates the cache', async () => {
      faqs.publish.mockResolvedValue(faqWith({ status: 'PUBLISHED' }));

      await expect(service.publish('id', actor)).resolves.toMatchObject({ status: 'PUBLISHED' });
      expect(cache.invalidate).toHaveBeenCalledWith('faq');
    });

    it('returns a published entry to draft', async () => {
      faqs.unpublish.mockResolvedValue(faqWith({ status: 'DRAFT' }));

      await expect(service.unpublish('id', actor)).resolves.toMatchObject({ status: 'DRAFT' });
    });

    it.each([
      ['publish', 'publish'],
      ['unpublish', 'unpublish'],
    ])('reports a missing entry on %s', async (_label, method) => {
      (faqs[method as 'publish' | 'unpublish'] as jest.Mock).mockResolvedValue(null);

      await expect(
        (service[method as 'publish' | 'unpublish'] as (id: string, a: AdminPrincipal) => unknown)(
          'id',
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reorder', () => {
    it('refuses a payload that names the same entry twice', async () => {
      await expect(
        service.reorder({ entries: [{ id: 'a', sortOrder: 0 }, { id: 'a', sortOrder: 1 }] }, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(faqs.reorder).not.toHaveBeenCalled();
    });

    it('reports when nothing matched', async () => {
      faqs.reorder.mockResolvedValue(0);

      await expect(
        service.reorder({ entries: [{ id: 'a', sortOrder: 0 }] }, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns how many entries moved', async () => {
      faqs.reorder.mockResolvedValue(2);

      await expect(
        service.reorder(
          { entries: [{ id: 'a', sortOrder: 1 }, { id: 'b', sortOrder: 0 }] },
          actor,
        ),
      ).resolves.toEqual({ reordered: 2 });
      expect(cache.invalidate).toHaveBeenCalledWith('faq');
    });
  });

  describe('delete', () => {
    it('reports a missing entry', async () => {
      faqs.delete.mockResolvedValue(false);

      await expect(service.delete('id', actor)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('confirms a deletion and invalidates the cache', async () => {
      faqs.delete.mockResolvedValue(true);

      await expect(service.delete('id', actor)).resolves.toEqual({
        message: 'FAQ deleted successfully',
      });
      expect(cache.invalidate).toHaveBeenCalledWith('faq');
    });
  });

  it('reports a missing entry on read', async () => {
    faqs.findById.mockResolvedValue(null);

    await expect(service.findOne('id')).rejects.toBeInstanceOf(NotFoundException);
  });
});
