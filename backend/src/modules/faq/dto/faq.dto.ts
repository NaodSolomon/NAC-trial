import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PublicFaqQueryDto {
  @ApiPropertyOptional({ enum: ['en', 'am'], default: 'en' })
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am' = 'en';

  @ApiPropertyOptional({ example: 'Services', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;
}

export class FaqQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['en', 'am'] })
  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode?: 'en' | 'am';

  @ApiPropertyOptional({ enum: ['DRAFT', 'SCHEDULED', 'PUBLISHED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'SCHEDULED', 'PUBLISHED'])
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';

  @ApiPropertyOptional({ example: 'Services', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;
}

export class CreateFaqDto {
  @ApiProperty({ example: 'what-does-the-center-do', maxLength: 180 })
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  translationKey!: string;

  @ApiProperty({ enum: ['en', 'am'], default: 'en' })
  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am' = 'en';

  @ApiProperty({ example: 'What does the center do?', maxLength: 500 })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  question!: string;

  @ApiProperty({ example: 'We provide autism support for children and families.', maxLength: 5000 })
  @IsString()
  @MinLength(1)
  @MaxLength(5_000)
  answer!: string;

  @ApiPropertyOptional({ example: 'Services', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;
}

export class UpdateFaqDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  question?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5_000)
  answer?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;
}

export class ReorderFaqEntryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReorderFaqDto {
  @ApiProperty({ type: [ReorderFaqEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReorderFaqEntryDto)
  entries!: ReorderFaqEntryDto[];
}
