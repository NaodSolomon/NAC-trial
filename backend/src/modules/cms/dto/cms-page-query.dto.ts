import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CmsPageQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode?: 'en' | 'am';

  @IsOptional()
  @IsIn(['DRAFT', 'SCHEDULED', 'PUBLISHED'])
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
}
