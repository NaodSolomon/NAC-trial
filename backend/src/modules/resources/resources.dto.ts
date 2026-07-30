import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ResourceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode?: 'en' | 'am';
}

export class CreateResourceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;
  @IsString()
  @MaxLength(2048)
  fileUrl!: string;
  @IsString()
  @MaxLength(255)
  fileName!: string;
  @IsString()
  @MaxLength(100)
  mimeType!: string;
  @IsIn(['en', 'am'])
  languageCode!: 'en' | 'am';
}
