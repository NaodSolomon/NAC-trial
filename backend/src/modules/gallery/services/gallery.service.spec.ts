import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ObjectStorage } from '../../media/interfaces/object-storage.interface';
import { MediaService } from '../../media/services/media.service';
import { GalleryRepository } from '../interfaces/gallery-repository.interface';
import { GalleryService } from './gallery.service';

describe('GalleryService', () => {
  let gallery: jest.Mocked<GalleryRepository>;
  let media: jest.Mocked<Pick<MediaService, 'upload' | 'delete' | 'findById'>>;
  let storage: jest.Mocked<ObjectStorage>;
  let service: GalleryService;
  const actor = {
    id: 'admin-id',
    email: 'admin@example.com',
    name: 'Admin',
    role: 'SUPER_ADMIN' as const,
  };

  beforeEach(() => {
    gallery = {
      list: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    media = { upload: jest.fn(), delete: jest.fn(), findById: jest.fn() };
    storage = { put: jest.fn(), delete: jest.fn(), publicUrl: jest.fn() };
    service = new GalleryService(gallery, storage, media as unknown as MediaService);
  });

  it('rejects documents before uploading them', async () => {
    await expect(
      service.upload(
        {
          buffer: Buffer.from('%PDF-'),
          filename: 'guide.pdf',
          mimeType: 'application/pdf',
          title: 'Guide',
          altText: 'Guide document',
          languageCode: 'en',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(media.upload).not.toHaveBeenCalled();
  });

  it('rejects an empty metadata update', async () => {
    await expect(service.update('item-id', {}, actor)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not delete an unknown gallery item', async () => {
    gallery.findById.mockResolvedValue(null);
    await expect(service.delete('item-id', actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.delete).not.toHaveBeenCalled();
  });
});
