import { NotFoundException } from '@nestjs/common';
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
});
