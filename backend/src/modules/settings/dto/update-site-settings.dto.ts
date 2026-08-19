import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsApprovedSeoImageUrl } from '../../seo/dto/validators/approved-seo-image-url.validator';

export class SocialLinksDto {
  @ApiPropertyOptional({ example: 'https://facebook.com/nehemiah', maxLength: 2048 })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  facebook?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/nehemiah', maxLength: 2048 })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  instagram?: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/@nehemiah', maxLength: 2048 })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  youtube?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/company/nehemiah', maxLength: 2048 })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  linkedin?: string;

  @ApiPropertyOptional({ example: 'https://x.com/nehemiah', maxLength: 2048 })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  x?: string;

  @ApiPropertyOptional({ example: 'https://tiktok.com/@nehemiah', maxLength: 2048 })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  tiktok?: string;
}

export class LocalizedValueDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  en?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  am?: string;
}

export class LocalizedTextDto {
  @ApiPropertyOptional({ type: () => LocalizedValueDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedValueDto)
  openingHours?: LocalizedValueDto;

  @ApiPropertyOptional({ type: () => LocalizedValueDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedValueDto)
  tagline?: LocalizedValueDto;

  @ApiPropertyOptional({ type: () => LocalizedValueDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedValueDto)
  footerAbout?: LocalizedValueDto;

  @ApiPropertyOptional({ type: () => LocalizedValueDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedValueDto)
  faqIntro?: LocalizedValueDto;
}

export class UpdateSiteSettingsDto {
  @ApiPropertyOptional({ example: 'Nehemiah Autism Center', minLength: 2, maxLength: 150 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  siteName?: string;

  @ApiPropertyOptional({ enum: ['en', 'am'], example: 'en' })
  @IsOptional()
  @IsIn(['en', 'am'])
  defaultLanguage?: 'en' | 'am';

  @ApiPropertyOptional({ type: [String], enum: ['en', 'am'], example: ['en', 'am'] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsIn(['en', 'am'], { each: true })
  supportedLanguages?: Array<'en' | 'am'>;

  @ApiPropertyOptional({ example: 'info@example.org', maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+251 11 000 0000', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: 'Addis Ababa, Ethiopia', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ type: () => SocialLinksDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  @ApiPropertyOptional({ example: 'https://media.example.org/share.jpg', maxLength: 2048 })
  @IsOptional()
  @IsApprovedSeoImageUrl()
  @MaxLength(2048)
  defaultShareImageUrl?: string | null;

  @ApiPropertyOptional({ type: () => LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  localizedText?: LocalizedTextDto;
}
