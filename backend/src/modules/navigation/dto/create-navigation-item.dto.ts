import { IsIn, IsInt, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNavigationItemDto {
  @ApiProperty({ example: 'About us', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;

  @ApiProperty({ example: '/about', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  @Matches(/^(?:\/(?!\/)\S*|https?:\/\/\S+)$/, {
    message: 'url must be an internal path or an HTTP(S) URL',
  })
  url: string;

  @ApiProperty({ example: 10, minimum: 0, maximum: 10_000 })
  @IsInt()
  @Min(0)
  @Max(10_000)
  order: number;

  @ApiProperty({ enum: ['en', 'am'], example: 'en' })
  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am';
}
