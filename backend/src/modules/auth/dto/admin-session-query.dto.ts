import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { AdminSessionFilterStatus } from '../interfaces/admin-session.types';

const SESSION_STATUSES: AdminSessionFilterStatus[] = ['active', 'revoked', 'expired', 'all'];

export class AdminSessionQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ format: 'uuid', description: 'Limit results to one administrator' })
  @IsOptional()
  @IsUUID()
  adminId?: string;

  @ApiPropertyOptional({ enum: SESSION_STATUSES, default: 'active' })
  @IsOptional()
  @IsIn(SESSION_STATUSES)
  status: AdminSessionFilterStatus = 'active';

  get offset(): number {
    return (this.page - 1) * this.limit;
  }
}
