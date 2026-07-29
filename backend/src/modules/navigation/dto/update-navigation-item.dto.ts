import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateNavigationItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(?:\/(?!\/)\S*|https?:\/\/\S+)$/, {
    message: 'url must be an internal path or an HTTP(S) URL',
  })
  url?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
