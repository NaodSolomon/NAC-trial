import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class EventQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am' = 'en';

  @IsOptional()
  @IsIn(['upcoming', 'past', 'all'])
  timeframe: 'upcoming' | 'past' | 'all' = 'upcoming';

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED';
}

export class EventLanguageQueryDto {
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am' = 'en';
}

export class CreateEventDto {
  @IsString() @MinLength(2) @MaxLength(180) @Matches(SLUG_PATTERN) slug!: string;
  @IsString() @MinLength(2) @MaxLength(255) title!: string;
  @IsString() @MinLength(2) @MaxLength(10_000) description!: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsString() @MinLength(2) @MaxLength(500) location!: string;
  @IsBoolean() rsvpEnabled!: boolean;
  @IsIn(['DRAFT', 'PUBLISHED']) status!: 'DRAFT' | 'PUBLISHED';
  @IsIn(['en', 'am']) languageCode!: 'en' | 'am';
  @IsOptional() @IsUUID() translationKey?: string;
}

export class UpdateEventDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) @Matches(SLUG_PATTERN) slug?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(255) title?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(10_000) description?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(500) location?: string;
  @IsOptional() @IsBoolean() rsvpEnabled?: boolean;
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED']) status?: 'DRAFT' | 'PUBLISHED';
}

export class CreateRsvpDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsEmail() @MaxLength(255) email!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(20) attendees!: number;
}

export class RsvpQueryDto extends PaginationQueryDto {}
