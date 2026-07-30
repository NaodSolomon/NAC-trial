import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminPrincipal } from '../auth/interfaces/auth.types';
import { ApplicationCache } from '../cache/cache.interface';
import { BlogRepository } from './interfaces/blog-repository.interface';
import { BlogService } from './blog.service';

describe('BlogService', () => {
  const repository = {
    list: jest.fn(),
    findPublished: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    publish: jest.fn(),
    delete: jest.fn(),
  };
  const cache = {
    remember: jest.fn(async (_namespace, _key, _ttl, loader) => loader()),
    invalidate: jest.fn(),
  };
  const service = new BlogService(
    repository as BlogRepository,
    cache as unknown as ApplicationCache,
  );
  const actor: AdminPrincipal = {
    id: '77936a36-2a5b-4551-852a-2ee8323059a5',
    name: 'Administrator',
    email: 'admin@example.test',
    role: 'SUPER_ADMIN',
  };

  beforeEach(() => jest.clearAllMocks());

  it('caches public lists and bypasses the cache for administrative lists', async () => {
    repository.list.mockResolvedValue({ data: [], meta: { total: 0 } });
    const query = {
      page: 1,
      limit: 10,
      offset: 0,
      sortOrder: 'desc' as const,
      languageCode: 'en' as const,
    };

    await service.listPublic(query);
    expect(cache.remember).toHaveBeenCalledWith(
      'blog',
      JSON.stringify(query),
      120,
      expect.any(Function),
    );
    expect(repository.list).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      offset: 0,
      languageCode: 'en',
      publicOnly: true,
    });

    jest.clearAllMocks();
    await service.listAdmin(query);
    expect(repository.list).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      offset: 0,
      languageCode: 'en',
      publicOnly: false,
    });
    expect(cache.remember).not.toHaveBeenCalled();
  });

  it('never exposes a missing or draft post through the public detail service', async () => {
    repository.findPublished.mockResolvedValue(null);
    await expect(service.findPublic('draft', { languageCode: 'en' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('invalidates public blog cache after publishing', async () => {
    repository.publish.mockResolvedValue({ id: 'post-id', status: 'PUBLISHED' });
    await service.publish('post-id', actor);
    expect(repository.publish).toHaveBeenCalledWith('post-id', actor.id);
    expect(cache.invalidate).toHaveBeenCalledWith('blog');
  });

  it('passes the acting administrator to every mutation', async () => {
    repository.create.mockResolvedValue({ id: 'post-id' });
    repository.update.mockResolvedValue({ id: 'post-id' });
    repository.delete.mockResolvedValue(true);

    await service.create(
      {
        slug: 'support',
        languageCode: 'en',
        title: 'Support',
        excerpt: 'Support excerpt',
        content: 'Support content',
      },
      actor,
    );
    await service.update('post-id', { title: 'Updated support' }, actor);
    await service.delete('post-id', actor);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: actor.id }),
      actor.id,
    );
    expect(repository.update).toHaveBeenCalledWith(
      'post-id',
      { title: 'Updated support' },
      actor.id,
    );
    expect(repository.delete).toHaveBeenCalledWith('post-id', actor.id);
  });

  it('normalizes author-controlled text when creating a post', async () => {
    repository.create.mockResolvedValue({ id: 'post-id' });

    await service.create(
      {
        slug: 'support',
        languageCode: 'en',
        title: '  Support  ',
        excerpt: '  Guidance  ',
        content: 'Content',
        seoTitle: '  SEO title  ',
        seoDescription: '  SEO description  ',
      },
      actor,
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Support',
        excerpt: 'Guidance',
        seoTitle: 'SEO title',
        seoDescription: 'SEO description',
      }),
      actor.id,
    );
  });

  it('rejects an empty update before repository access', async () => {
    await expect(service.update('post-id', {}, actor)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it.each([
    ['update', () => service.update('missing-id', { title: 'Missing' }, actor)],
    ['publish', () => service.publish('missing-id', actor)],
    ['delete', () => service.delete('missing-id', actor)],
  ])('rejects a missing post during %s', async (_operation, execute) => {
    repository.update.mockResolvedValue(null);
    repository.publish.mockResolvedValue(null);
    repository.delete.mockResolvedValue(false);

    await expect(execute()).rejects.toBeInstanceOf(NotFoundException);
  });
});
