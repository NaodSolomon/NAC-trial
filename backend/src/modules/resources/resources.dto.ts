import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IsApprovedResourceUrl } from './validators/approved-resource-url.validator';

export const RESOURCE_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
] as const;

export class ResourceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode?: 'en' | 'am';
}

export class CreateResourceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;
  @IsString()
  @MaxLength(2048)
  @IsApprovedResourceUrl()
  fileUrl!: string;
  @IsString()
  @MaxLength(255)
  fileName!: string;
  @IsString()
  @IsIn(RESOURCE_MIME_TYPES)
  mimeType!: (typeof RESOURCE_MIME_TYPES)[number];
  @IsIn(['en', 'am'])
  languageCode!: 'en' | 'am';
}
