import { IsEmail, IsIn, IsOptional, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class NewsletterSignupDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am' = 'en';
}

export class NewsletterQueryDto extends PaginationQueryDto {}

export class NewsletterEmailParamDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
