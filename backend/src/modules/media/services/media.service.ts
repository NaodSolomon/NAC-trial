import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { MediaQueryDto } from '../dto/media-query.dto';
import { MEDIA_REPOSITORY, MediaRepository } from '../interfaces/media-repository.interface';
import { OBJECT_STORAGE, ObjectStorage } from '../interfaces/object-storage.interface';
import { MediaFilePolicyService } from './media-file-policy.service';

export interface MediaUpload {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  languageCode?: string;
  altText?: string;
  caption?: string;
  folder?: string;
}

@Injectable()
export class MediaService {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly media: MediaRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    private readonly filePolicy: MediaFilePolicyService,
  ) {}

  list(query: MediaQueryDto) {
    return this.media.list({
      page: query.page,
      limit: query.limit,
      offset: query.offset,
      sortOrder: query.sortOrder,
      type: query.type,
      search: query.search?.trim(),
    });
  }

  findById(id: string) {
    return this.media.findById(id);
  }

  async upload(input: MediaUpload, actor: AdminPrincipal) {
    const policy = this.filePolicy.validate(input.mimeType, input.buffer);
    const languageCode = input.languageCode ?? 'en';
    if (languageCode !== 'en' && languageCode !== 'am') {
      throw new BadRequestException('languageCode must be en or am');
    }

    const altText = input.altText?.trim();
    if (policy.type === 'IMAGE' && !altText) {
      throw new BadRequestException('altText is required for images');
    }
    if (altText && altText.length > 500) {
      throw new BadRequestException('altText must not exceed 500 characters');
    }
    const caption = input.caption?.trim();
    if (caption && caption.length > 1000) {
      throw new BadRequestException('caption must not exceed 1000 characters');
    }

    const folder = this.normalizeFolder(input.folder);
    const date = new Date();
    const objectKey = [
      folder,
      String(date.getUTCFullYear()),
      String(date.getUTCMonth() + 1).padStart(2, '0'),
      `${randomUUID()}.${policy.extension}`,
    ].join('/');

    await this.storage.put({
      objectKey,
      body: input.buffer,
      contentType: input.mimeType,
    });

    try {
      return await this.media.create(
        {
          objectKey,
          publicUrl: this.storage.publicUrl(objectKey),
          originalName: basename(input.filename.replaceAll('\\', '/')).slice(0, 255),
          mimeType: input.mimeType,
          sizeBytes: input.buffer.length,
          type: policy.type,
          uploadedBy: actor.id,
        },
        altText
          ? {
              languageCode,
              altText,
              caption: caption || null,
            }
          : null,
        actor.id,
      );
    } catch (error) {
      await this.storage.delete(objectKey).catch(() => undefined);
      throw error;
    }
  }

  async delete(id: string, actor: AdminPrincipal): Promise<{ message: string }> {
    const asset = await this.media.findById(id);
    if (!asset) {
      throw new NotFoundException(`Media asset ${id} was not found`);
    }

    await this.storage.delete(asset.objectKey);
    if (!(await this.media.delete(id, actor.id))) {
      throw new NotFoundException(`Media asset ${id} was not found`);
    }

    return { message: 'Media deleted successfully' };
  }

  private normalizeFolder(value?: string): string {
    const folder = value?.trim().toLowerCase() || 'media';
    if (!/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(folder) || folder.length > 100) {
      throw new BadRequestException(
        'folder may contain lowercase letters, numbers, hyphens, and single slashes',
      );
    }
    return folder;
  }
}
