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
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNavigationItemDto {
  @ApiPropertyOptional({ example: 'About us', minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({ example: '/about', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(?:\/(?!\/)\S*|https?:\/\/\S+)$/, {
    message: 'url must be an internal path or an HTTP(S) URL',
  })
  url?: string;

  @ApiPropertyOptional({ example: 10, minimum: 0, maximum: 10_000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  order?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
