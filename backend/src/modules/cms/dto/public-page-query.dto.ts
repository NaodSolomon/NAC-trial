import { IsIn, IsOptional } from 'class-validator';

export class PublicPageQueryDto {
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am' = 'en';
}
