import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ContactQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode?: 'en' | 'am';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
