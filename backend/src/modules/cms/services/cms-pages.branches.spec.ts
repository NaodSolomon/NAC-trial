import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CmsPage } from '../../../database/schema';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { ApplicationCache } from '../../cache/cache.interface';
import { CmsPageRepository } from '../interfaces/cms-page-repository.interface';
import { CmsPagesService } from './cms-pages.service';

const actor: AdminPrincipal = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Editor',
  email: 'editor@example.org',
  role: 'CONTENT_EDITOR',
};

function pageWith(overrides: Partial<CmsPage> = {}): CmsPage {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    slug: 'services',
    languageCode: 'en',
    title: 'Family support services',
    content: 'Published content.',
    metadata: {},
    status: 'DRAFT',
    ...overrides,
  } as unknown as CmsPage;
}

describe('CmsPagesService branch behaviour', () => {
  let pages: jest.Mocked<CmsPageRepository>;
  let cache: jest.Mocked<ApplicationCache>;
  let service: CmsPagesService;

  beforeEach(() => {
    pages = {
      list: jest.fn(),
      findById: jest.fn(),
      findPublished: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      publish: jest.fn(),
      schedule: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<CmsPageRepository>;
    cache = {
      remember: jest.fn(async (_ns, _key, _ttl, loader: () => unknown) => loader()),
      invalidate: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<ApplicationCache>;
    service = new CmsPagesService(pages, cache);
  });

  it('reports a missing administrative page', async () => {
    pages.findById.mockResolvedValue(undefined as never);

    await expect(service.findAdminPage('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reports a missing published page', async () => {
    pages.findPublished.mockResolvedValue(undefined as never);

    await expect(service.findPublicPage('nothing', 'en')).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('update', () => {
    it('refuses an empty payload', async () => {
      await expect(service.update('id', {}, actor)).rejects.toBeInstanceOf(BadRequestException);
      expect(pages.update).not.toHaveBeenCalled();
    });

    it('forwards only the supplied fields', async () => {
      pages.update.mockResolvedValue(pageWith());

      await service.update('id', { title: '  Trimmed  ' }, actor);

      expect(pages.update).toHaveBeenCalledWith('id', { title: 'Trimmed' }, actor.id);
    });

    it('collapses blank SEO fields to null', async () => {
      pages.update.mockResolvedValue(pageWith());

      await service.update(
        'id',
        { seoTitle: '   ', seoDescription: '  ', seoImageUrl: '   ' },
        actor,
      );

      expect(pages.update).toHaveBeenCalledWith(
        'id',
        { seoTitle: null, seoDescription: null, seoImageUrl: null },
        actor.id,
      );
    });

    it('keeps populated SEO fields after trimming', async () => {
      pages.update.mockResolvedValue(pageWith());

      await service.update(
        'id',
        { seoTitle: ' Title ', seoDescription: ' Description ', seoImageUrl: ' https://x/y.png ' },
        actor,
      );

      expect(pages.update).toHaveBeenCalledWith(
        'id',
        {
          seoTitle: 'Title',
          seoDescription: 'Description',
          seoImageUrl: 'https://x/y.png',
        },
        actor.id,
      );
    });

    it('forwards slug, content and metadata unchanged', async () => {
      pages.update.mockResolvedValue(pageWith());
      const metadata = { sections: [] };

      await service.update('id', { slug: 'new-slug', content: 'Body', metadata }, actor);

      expect(pages.update).toHaveBeenCalledWith(
        'id',
        { slug: 'new-slug', content: 'Body', metadata },
        actor.id,
      );
    });

    it('reports a page that disappeared before the update landed', async () => {
      pages.update.mockResolvedValue(undefined as never);

      await expect(service.update('id', { title: 'x' }, actor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it.each([
      ['a direct code', { code: '23505' }],
      ['a wrapped code', { cause: { code: '23505' } }],
    ])('translates %s unique violation into a conflict', async (_label, rejection) => {
      pages.update.mockRejectedValue(rejection);

      await expect(service.update('id', { title: 'x' }, actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it.each([
      ['a plain error', new Error('offline')],
      ['a null rejection', null],
      ['an unrelated code', { code: '42P01' }],
      ['a non-object cause', { cause: 'nope' }],
      ['a null cause', { cause: null }],
      ['a cause without a code', { cause: {} }],
    ])('rethrows %s untouched', async (_label, rejection) => {
      pages.update.mockRejectedValue(rejection);

      await expect(service.update('id', { title: 'x' }, actor)).rejects.not.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('launch content approval', () => {
    it('publishes an ordinary page without an approval flag', async () => {
      pages.findById.mockResolvedValue(pageWith({ slug: 'services' }));
      pages.publish.mockResolvedValue(pageWith({ status: 'PUBLISHED' }));

      await expect(service.publish('id', actor)).resolves.toMatchObject({ status: 'PUBLISHED' });
    });

    it.each(['about', 'team'])('refuses to publish %s without explicit approval', async (slug) => {
      pages.findById.mockResolvedValue(pageWith({ slug, metadata: {} as never }));

      await expect(service.publish('id', actor)).rejects.toBeInstanceOf(BadRequestException);
      expect(pages.publish).not.toHaveBeenCalled();
    });

    it('refuses to publish an approved team page with no biographies', async () => {
      pages.findById.mockResolvedValue(
        pageWith({ slug: 'team', metadata: { contentApproved: true } as never }),
      );

      await expect(service.publish('id', actor)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses to publish an approved team page with an empty biography list', async () => {
      pages.findById.mockResolvedValue(
        pageWith({ slug: 'team', metadata: { contentApproved: true, teamMembers: [] } as never }),
      );

      await expect(service.publish('id', actor)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('publishes an approved team page that has biographies', async () => {
      pages.findById.mockResolvedValue(
        pageWith({
          slug: 'team',
          metadata: {
            contentApproved: true,
            teamMembers: [{ name: 'Therapist', role: 'Lead', biography: 'Bio' }],
          } as never,
        }),
      );
      pages.publish.mockResolvedValue(pageWith({ slug: 'team', status: 'PUBLISHED' }));

      await expect(service.publish('id', actor)).resolves.toMatchObject({ status: 'PUBLISHED' });
    });

    it('publishes an approved about page', async () => {
      pages.findById.mockResolvedValue(
        pageWith({ slug: 'about', metadata: { contentApproved: true } as never }),
      );
      pages.publish.mockResolvedValue(pageWith({ slug: 'about', status: 'PUBLISHED' }));

      await expect(service.publish('id', actor)).resolves.toMatchObject({ status: 'PUBLISHED' });
    });

    it('reports a page that disappeared before publication', async () => {
      pages.findById.mockResolvedValue(pageWith());
      pages.publish.mockResolvedValue(undefined as never);

      await expect(service.publish('id', actor)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('reports a missing page on delete', async () => {
    pages.delete.mockResolvedValue(false as never);

    await expect(service.delete('id', actor)).rejects.toBeInstanceOf(NotFoundException);
  });
});
