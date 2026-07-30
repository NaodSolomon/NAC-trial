import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@nehemiah.org', format: 'email' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'strong-password', format: 'password', writeOnly: true })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
