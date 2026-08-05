import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { SeoLanguageCode } from '../interfaces/seo-response.interface';

export class SeoLanguageQueryDto {
  @ApiPropertyOptional({ enum: ['en', 'am'], default: 'en' })
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode: SeoLanguageCode = 'en';
}
