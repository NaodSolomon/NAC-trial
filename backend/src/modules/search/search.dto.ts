import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PublicSearchDto {
  @IsString() @MinLength(2) @MaxLength(100)
  q!: string;
  @IsOptional() @IsIn(['en', 'am'])
  languageCode?: 'en' | 'am';
}
