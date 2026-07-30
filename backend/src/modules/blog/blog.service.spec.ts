import { NotFoundException } from '@nestjs/common';
import { ApplicationCache } from '../cache/cache.interface';
import { BlogRepository } from './blog.repository';
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
    repository as unknown as BlogRepository,
    cache as unknown as ApplicationCache,
  );

  beforeEach(() => jest.clearAllMocks());

  it('never exposes a missing or draft post through the public detail service', async () => {
    repository.findPublished.mockResolvedValue(null);
    await expect(service.findPublic('draft', { languageCode: 'en' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('invalidates public blog cache after publishing', async () => {
    repository.publish.mockResolvedValue({ id: 'post-id', status: 'PUBLISHED' });
    await service.publish('post-id');
    expect(cache.invalidate).toHaveBeenCalledWith('blog');
  });
});
