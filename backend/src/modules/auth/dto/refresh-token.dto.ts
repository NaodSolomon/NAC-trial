import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Opaque JWT refresh token', writeOnly: true })
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  refreshToken!: string;
}
