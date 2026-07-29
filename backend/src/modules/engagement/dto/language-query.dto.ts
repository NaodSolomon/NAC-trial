import { IsIn, IsOptional } from 'class-validator';

export class LanguageQueryDto {
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am' = 'en';
}
