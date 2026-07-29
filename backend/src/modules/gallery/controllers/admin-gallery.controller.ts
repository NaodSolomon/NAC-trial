import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  PayloadTooLargeException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MultipartFile } from '@fastify/multipart';
import { FastifyRequest } from 'fastify';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { UpdateGalleryItemDto } from '../dto/gallery.dto';
import { GalleryService } from '../services/gallery.service';

@Controller('admin/gallery')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'CONTENT_EDITOR')
export class AdminGalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Post()
  async upload(@Req() request: FastifyRequest, @CurrentAdmin() actor: AdminPrincipal) {
    if (!request.isMultipart()) {
      throw new BadRequestException('Content-Type must be multipart/form-data');
    }
    let file: MultipartFile | undefined;
    let buffer: Buffer | undefined;
    const fields: Record<string, string> = {};
    const allowedFields = new Set(['title', 'altText', 'languageCode', 'lang']);
    try {
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (file) throw new BadRequestException('Only one file may be uploaded');
          file = part;
          buffer = await part.toBuffer();
        } else {
          if (!allowedFields.has(part.fieldname)) {
            throw new BadRequestException(`Unexpected multipart field: ${part.fieldname}`);
          }
          if (part.fieldname in fields) {
            throw new BadRequestException(`Duplicate multipart field: ${part.fieldname}`);
          }
          fields[part.fieldname] = String(part.value);
        }
      }
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'FST_REQ_FILE_TOO_LARGE'
      ) {
        throw new PayloadTooLargeException('File exceeds the configured upload limit');
      }
      throw error;
    }
    if (!file || !buffer) throw new BadRequestException('A file is required');
    const title = fields.title?.trim();
    const altText = fields.altText?.trim();
    const languageCode = fields.languageCode ?? fields.lang ?? 'en';
    if (!title || title.length < 2 || title.length > 255) {
      throw new BadRequestException('title must contain between 2 and 255 characters');
    }
    if (!altText || altText.length < 2 || altText.length > 500) {
      throw new BadRequestException('altText must contain between 2 and 500 characters');
    }
    if (languageCode !== 'en' && languageCode !== 'am') {
      throw new BadRequestException('languageCode must be en or am');
    }
    return this.galleryService.upload(
      {
        buffer,
        filename: file.filename,
        mimeType: file.mimetype,
        title,
        altText,
        languageCode,
      },
      actor,
    );
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGalleryItemDto,
    @CurrentAdmin() actor: AdminPrincipal,
  ) {
    return this.galleryService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  delete(@Param('id', new ParseUUIDPipe()) id: string, @CurrentAdmin() actor: AdminPrincipal) {
    return this.galleryService.delete(id, actor);
  }
}
