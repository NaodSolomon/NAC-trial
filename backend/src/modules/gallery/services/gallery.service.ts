import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { OBJECT_STORAGE, ObjectStorage } from '../../media/interfaces/object-storage.interface';
import { MediaService } from '../../media/services/media.service';
import { GalleryQueryDto, GalleryUploadDto, UpdateGalleryItemDto } from '../dto/gallery.dto';
import { GALLERY_REPOSITORY, GalleryRepository } from '../interfaces/gallery-repository.interface';

@Injectable()
export class GalleryService {
  constructor(
    @Inject(GALLERY_REPOSITORY) private readonly gallery: GalleryRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    private readonly media: MediaService,
  ) {}

  list(query: GalleryQueryDto) {
    return this.gallery.list({
      page: query.page,
      limit: query.limit,
      offset: query.offset,
      sortOrder: query.sortOrder,
      languageCode: query.languageCode,
      type: query.type,
    });
  }

  async upload(input: GalleryUploadDto, actor: AdminPrincipal) {
    if (!input.mimeType.startsWith('image/') && !input.mimeType.startsWith('video/')) {
      throw new BadRequestException('Gallery accepts image and video files only');
    }
    const media = await this.media.upload(
      {
        buffer: input.buffer,
        filename: input.filename,
        mimeType: input.mimeType,
        languageCode: input.languageCode,
        altText: input.altText,
        caption: input.title,
        folder: 'gallery',
      },
      actor,
    );
    try {
      return await this.gallery.create(
        {
          mediaId: media.id,
          title: input.title.trim(),
          altText: input.altText.trim(),
          languageCode: input.languageCode,
          createdBy: actor.id,
        },
        actor.id,
      );
    } catch (error) {
      await this.media.delete(media.id, actor).catch(() => undefined);
      throw error;
    }
  }

  async update(id: string, dto: UpdateGalleryItemDto, actor: AdminPrincipal) {
    if (!Object.keys(dto).length) {
      throw new BadRequestException('At least one field must be provided');
    }
    const updated = await this.gallery.update(
      id,
      {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.altText !== undefined && { altText: dto.altText.trim() }),
      },
      actor.id,
    );
    if (!updated) throw new NotFoundException(`Gallery item ${id} was not found`);
    return updated;
  }

  async delete(id: string, actor: AdminPrincipal) {
    const item = await this.gallery.findById(id);
    if (!item) throw new NotFoundException(`Gallery item ${id} was not found`);
    const asset = await this.media.findById(item.mediaId);
    if (!asset) throw new NotFoundException(`Media asset ${item.mediaId} was not found`);
    await this.storage.delete(asset.objectKey);
    if (!(await this.gallery.delete(id, actor.id))) {
      throw new NotFoundException(`Gallery item ${id} was not found`);
    }
    return { deleted: true };
  }
}
