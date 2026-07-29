import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class MediaQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(['IMAGE', 'VIDEO', 'DOCUMENT'])
  type?: 'IMAGE' | 'VIDEO' | 'DOCUMENT';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
