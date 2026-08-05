import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SeoLanguageCode } from '../interfaces/seo-response.interface';
import { IsApprovedSeoImageUrl } from './validators/approved-seo-image-url.validator';

export class UpdateSeoDto {
  @ApiProperty({ enum: ['en', 'am'] })
  @IsIn(['en', 'am'])
  languageCode!: SeoLanguageCode;

  @ApiPropertyOptional({ maxLength: 70, nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(70)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  title?: string | null;

  @ApiPropertyOptional({ maxLength: 160, nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  description?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(40, { each: true })
  @Transform(({ value }: { value: unknown }) => normalizeKeywords(value))
  keywords?: string[];

  @ApiPropertyOptional({ maxLength: 2048, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @IsApprovedSeoImageUrl()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  imageUrl?: string | null;
}

function normalizeKeywords(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return [
    ...new Set(
      value.map((keyword) =>
        typeof keyword === 'string' ? keyword.trim().toLocaleLowerCase('en-US') : keyword,
      ),
    ),
  ];
}
