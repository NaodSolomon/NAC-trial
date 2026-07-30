import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CmsPageMetadataDto } from './cms-page-metadata.dto';

export class UpdateCmsPageDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must use lowercase kebab-case',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  content?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CmsPageMetadataDto)
  metadata?: CmsPageMetadataDto;

  @IsOptional()
  @IsString()
  @MaxLength(70)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  seoImageUrl?: string;
}
