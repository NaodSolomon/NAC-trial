import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class PasswordResetRequestDto {
  @ApiProperty({ format: 'email', example: 'admin@example.org' })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class PasswordResetConfirmDto {
  @ApiProperty({
    minLength: 64,
    maxLength: 64,
    description: 'Single-use token delivered in the password-reset email',
  })
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/i, { message: 'token must be a valid password-reset token' })
  token!: string;

  @ApiProperty({ minLength: 12, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'newPassword must include uppercase, lowercase, and numeric characters',
  })
  newPassword!: string;
}

export class PasswordResetMessageDto {
  @ApiProperty({ example: 'If the account exists, password reset instructions have been sent.' })
  message!: string;
}

export class PasswordResetApiResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PasswordResetMessageDto })
  data!: PasswordResetMessageDto;

  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}
