import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class RevokeSessionDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Revoke exactly one session' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Revoke every non-revoked session belonging to one administrator',
  })
  @IsOptional()
  @IsUUID()
  adminId?: string;
}
