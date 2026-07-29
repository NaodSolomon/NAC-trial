import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateTestimonialDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  text!: string;

  @IsIn(['en', 'am'])
  languageCode!: 'en' | 'am';

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status: 'DRAFT' | 'PUBLISHED' = 'DRAFT';

  @IsOptional()
  @IsUUID()
  translationKey?: string;
}
