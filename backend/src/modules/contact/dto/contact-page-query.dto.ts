import { IsIn, IsOptional } from 'class-validator';

export class ContactPageQueryDto {
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am' = 'en';
}
