import { ApiProperty } from '@nestjs/swagger';

export type SeoLanguageCode = 'en' | 'am';

export interface SeoResponse {
  slug: string;
  languageCode: SeoLanguageCode;
  title: string;
  description: string | null;
  keywords: string[];
  imageUrl: string | null;
}

export interface SeoRecord {
  id: string;
  slug: string;
  languageCode: SeoLanguageCode;
  pageTitle: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  seoImageUrl: string | null;
}

export class SeoResponseDto implements SeoResponse {
  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ['en', 'am'] })
  languageCode!: SeoLanguageCode;

  @ApiProperty({ maxLength: 255 })
  title!: string;

  @ApiProperty({ nullable: true, maxLength: 160 })
  description!: string | null;

  @ApiProperty({ type: [String], maxItems: 10 })
  keywords!: string[];

  @ApiProperty({ nullable: true, maxLength: 2048 })
  imageUrl!: string | null;
}

export class SeoApiResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SeoResponseDto })
  data!: SeoResponseDto;

  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}
