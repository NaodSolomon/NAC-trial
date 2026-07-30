import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { MediaQueryDto } from '../dto/media-query.dto';
import { MediaService } from '../services/media.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Admin Media')
@ApiBearerAuth('admin-jwt')
@Controller('admin/media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'CONTENT_EDITOR')
export class AdminMediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  list(@Query() query: MediaQueryDto) {
    return this.mediaService.list(query);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload one validated media file to object storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'languageCode', 'altText'],
      properties: {
        file: { type: 'string', format: 'binary' },
        languageCode: { type: 'string', enum: ['en', 'am'] },
        altText: { type: 'string', maxLength: 500 },
        caption: { type: 'string', maxLength: 1000 },
        folder: { type: 'string', example: 'pages' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Media metadata and public URL' })
  @ApiResponse({ status: 413, description: 'File exceeds configured upload limit' })
  async upload(@Req() request: FastifyRequest, @CurrentAdmin() actor: AdminPrincipal) {
    if (!request.isMultipart()) {
      throw new BadRequestException('Content-Type must be multipart/form-data');
    }

    let uploadedFile: MultipartFile | undefined;
    let buffer: Buffer | undefined;
    const fields: Record<string, string> = {};
    const allowedFields = new Set(['languageCode', 'altText', 'caption', 'folder']);

    try {
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (uploadedFile) {
            throw new BadRequestException('Only one file may be uploaded');
          }
          uploadedFile = part;
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

    if (!uploadedFile || !buffer) {
      throw new BadRequestException('A file is required');
    }

    return this.mediaService.upload(
      {
        buffer,
        filename: uploadedFile.filename,
        mimeType: uploadedFile.mimetype,
        languageCode: fields.languageCode,
        altText: fields.altText,
        caption: fields.caption,
        folder: fields.folder,
      },
      actor,
    );
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  delete(@Param('id', new ParseUUIDPipe()) id: string, @CurrentAdmin() actor: AdminPrincipal) {
    return this.mediaService.delete(id, actor);
  }
}
