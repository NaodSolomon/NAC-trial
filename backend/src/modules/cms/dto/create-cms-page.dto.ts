import { Type } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CmsPageMetadataDto } from './cms-page-metadata.dto';

export class CreateCmsPageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must use lowercase kebab-case',
  })
  slug: string;

  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am';

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  content: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CmsPageMetadataDto)
  metadata?: CmsPageMetadataDto;

  @IsOptional()
  @IsUUID()
  translationKey?: string;

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
