import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class BlogQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode?: 'en' | 'am';
}

export class BlogLanguageDto {
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am' = 'en';
}

export class CreateBlogPostDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  slug!: string;
  @IsIn(['en', 'am'])
  languageCode!: 'en' | 'am';
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  excerpt!: string;
  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  content!: string;
  @IsOptional()
  @IsString()
  @MaxLength(70)
  seoTitle?: string;
  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoDescription?: string;
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  seoImageUrl?: string;
}

export class UpdateBlogPostDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  slug?: string;
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  excerpt?: string;
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  content?: string;
  @IsOptional()
  @IsString()
  @MaxLength(70)
  seoTitle?: string;
  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoDescription?: string;
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  seoImageUrl?: string;
}
