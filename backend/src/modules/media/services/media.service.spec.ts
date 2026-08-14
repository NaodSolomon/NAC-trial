import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MediaAssetView, MediaRepository } from '../interfaces/media-repository.interface';
import { ObjectStorage } from '../interfaces/object-storage.interface';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { MediaFilePolicyService } from './media-file-policy.service';
import { MediaService } from './media.service';

const now = new Date();
const actor: AdminPrincipal = {
  id: '2a15a8e4-71c4-4bd0-b250-bc425b76fa8f',
  name: 'Content Editor',
  email: 'editor@example.com',
  role: 'CONTENT_EDITOR',
};
const asset: MediaAssetView = {
  id: '239fc6d9-31f8-47fd-958d-c3a69b2c9ec7',
  objectKey: 'gallery/2026/07/file.png',
  publicUrl: 'https://cdn.example.com/gallery/2026/07/file.png',
  originalName: 'therapy.png',
  mimeType: 'image/png',
  sizeBytes: 8,
  type: 'IMAGE',
  uploadedBy: actor.id,
  createdAt: now,
  translations: [],
};
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('MediaService', () => {
  let repository: jest.Mocked<MediaRepository>;
  let storage: jest.Mocked<ObjectStorage>;
  let service: MediaService;

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      create: jest.fn().mockResolvedValue(asset),
      findById: jest.fn(),
      deleteAndEnqueueStorageCleanup: jest.fn(),
    };
    storage = {
      put: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      publicUrl: jest.fn().mockReturnValue(asset.publicUrl),
    };
    service = new MediaService(repository, storage, new MediaFilePolicyService());
  });

  it('requires accessible alt text for image uploads', async () => {
    await expect(
      service.upload(
        {
          buffer: png,
          filename: 'therapy.png',
          mimeType: 'image/png',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('uses a generated object key and persists verified metadata', async () => {
    await service.upload(
      {
        buffer: png,
        filename: '..\\therapy.png',
        mimeType: 'image/png',
        altText: 'Child participating in a therapy activity',
        languageCode: 'en',
        folder: 'gallery',
      },
      actor,
    );

    expect(storage.put).toHaveBeenCalledWith(
      expect.objectContaining({
        objectKey: expect.stringMatching(/^gallery\/\d{4}\/\d{2}\/[0-9a-f-]+\.png$/),
        contentType: 'image/png',
      }),
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        originalName: 'therapy.png',
        type: 'IMAGE',
        sizeBytes: png.length,
      }),
      expect.objectContaining({
        languageCode: 'en',
        altText: 'Child participating in a therapy activity',
      }),
      actor.id,
    );
  });

  it('removes the uploaded object when database persistence fails', async () => {
    repository.create.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.upload(
        {
          buffer: png,
          filename: 'therapy.png',
          mimeType: 'image/png',
          altText: 'Therapy activity',
        },
        actor,
      ),
    ).rejects.toThrow('database unavailable');
    expect(storage.delete).toHaveBeenCalledTimes(1);
  });

  it('does not call object storage inline and reports an unknown asset', async () => {
    repository.deleteAndEnqueueStorageCleanup.mockResolvedValue(false);

    await expect(service.delete(asset.id, actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('commits deletion through the repository without deleting storage inline', async () => {
    repository.deleteAndEnqueueStorageCleanup.mockResolvedValue(true);

    await expect(service.delete(asset.id, actor)).resolves.toEqual({
      message: 'Media deleted successfully',
    });
    expect(repository.deleteAndEnqueueStorageCleanup).toHaveBeenCalledWith(asset.id, actor.id);
    expect(storage.delete).not.toHaveBeenCalled();
  });
});
