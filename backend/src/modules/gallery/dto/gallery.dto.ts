import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class GalleryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am' = 'en';

  @IsOptional()
  @IsIn(['IMAGE', 'VIDEO'])
  type?: 'IMAGE' | 'VIDEO';
}

export class UpdateGalleryItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  altText?: string;
}

export interface GalleryUploadDto {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  title: string;
  altText: string;
  languageCode: 'en' | 'am';
}
