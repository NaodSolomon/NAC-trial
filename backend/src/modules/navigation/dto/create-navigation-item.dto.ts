import { IsIn, IsInt, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateNavigationItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;

  @IsString()
  @MaxLength(500)
  @Matches(/^(?:\/(?!\/)\S*|https?:\/\/\S+)$/, {
    message: 'url must be an internal path or an HTTP(S) URL',
  })
  url: string;

  @IsInt()
  @Min(0)
  @Max(10_000)
  order: number;

  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am';
}
