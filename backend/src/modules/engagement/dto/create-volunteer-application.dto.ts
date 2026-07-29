import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateVolunteerApplicationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @Matches(/^\+?[0-9 ()-]{7,25}$/)
  phone!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  roleInterest!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsIn(['en', 'am'])
  languageCode: 'en' | 'am' = 'en';
}
