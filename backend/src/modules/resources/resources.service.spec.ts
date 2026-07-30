import { AdminPrincipal } from '../auth/interfaces/auth.types';
import { ApplicationCache } from '../cache/cache.interface';
import { ResourceRepository } from './interfaces/resource-repository.interface';
import { ResourcesService } from './resources.service';

describe('ResourcesService', () => {
  const repository = {
    list: jest.fn(),
    create: jest.fn(),
    publish: jest.fn(),
    incrementPublishedDownload: jest.fn(),
    delete: jest.fn(),
  };
  const cache = {
    remember: jest.fn(async (_namespace, _key, _ttl, loader) => loader()),
    invalidate: jest.fn(),
  };
  const service = new ResourcesService(
    repository as ResourceRepository,
    cache as unknown as ApplicationCache,
  );
  const actor: AdminPrincipal = {
    id: '77936a36-2a5b-4551-852a-2ee8323059a5',
    name: 'Administrator',
    email: 'admin@example.test',
    role: 'SUPER_ADMIN',
  };

  beforeEach(() => jest.clearAllMocks());

  it('passes the acting administrator to every administrative mutation', async () => {
    repository.create.mockResolvedValue({ id: 'resource-id' });
    repository.publish.mockResolvedValue({ id: 'resource-id', status: 'PUBLISHED' });
    repository.delete.mockResolvedValue(true);
    const dto = {
      title: 'Family guide',
      description: 'A local guide',
      fileUrl: 'http://localhost/guide.pdf',
      fileName: 'guide.pdf',
      mimeType: 'application/pdf',
      languageCode: 'en' as const,
    };

    await service.create(dto, actor);
    await service.publish('resource-id', actor);
    await service.delete('resource-id', actor);

    expect(repository.create).toHaveBeenCalledWith({ ...dto, createdBy: actor.id }, actor.id);
    expect(repository.publish).toHaveBeenCalledWith('resource-id', actor.id);
    expect(repository.delete).toHaveBeenCalledWith('resource-id', actor.id);
    expect(cache.invalidate).toHaveBeenCalledTimes(3);
  });

  it('keeps public download counting separate from administrative auditing', async () => {
    repository.incrementPublishedDownload.mockResolvedValue({
      id: 'resource-id',
      fileUrl: 'http://localhost/guide.pdf',
      fileName: 'guide.pdf',
      mimeType: 'application/pdf',
      downloadCount: 1,
    });

    await expect(service.download('resource-id')).resolves.toMatchObject({ downloadCount: 1 });
    expect(repository.incrementPublishedDownload).toHaveBeenCalledWith('resource-id');
  });
});
