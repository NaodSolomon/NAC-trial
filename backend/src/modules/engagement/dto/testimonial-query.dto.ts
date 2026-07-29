import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PublicTestimonialQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am' = 'en';
}

export class AdminTestimonialQueryDto extends PublicTestimonialQueryDto {
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED';
}
