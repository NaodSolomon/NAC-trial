import { IsIn, IsOptional } from 'class-validator';

export class PublicNavigationQueryDto {
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am' = 'en';
}
