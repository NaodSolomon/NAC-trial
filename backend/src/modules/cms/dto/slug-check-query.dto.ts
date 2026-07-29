import { IsIn, Matches, MaxLength } from 'class-validator';

export class SlugCheckQueryDto {
  @MaxLength(180)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;

  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am';
}
