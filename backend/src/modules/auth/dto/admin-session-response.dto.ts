import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/api-response.dto';
import { AdminSessionStatus } from '../interfaces/admin-session.types';

export class AdminSessionAdministratorDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;
}

export class AdminSessionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: AdminSessionAdministratorDto })
  admin!: AdminSessionAdministratorDto;

  @ApiProperty({ example: 'Mozilla/5.0', nullable: true })
  userAgent!: string | null;

  @ApiProperty({
    example: 'd1e2f3a4b5c6',
    nullable: true,
    description: 'A short, non-reversible prefix of the stored IP hash',
  })
  ipFingerprint!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  lastUsedAt!: Date;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: Date;

  @ApiProperty({ enum: ['ACTIVE', 'REVOKED', 'EXPIRED'] })
  status!: AdminSessionStatus;
}

export class RevokeSessionResponseDto {
  @ApiProperty({ example: 'Session revoked successfully' })
  message!: string;

  @ApiProperty({ minimum: 0 })
  revokedCount!: number;
}

export class AdminSessionPaginatedDataDto {
  @ApiProperty({ type: AdminSessionResponseDto, isArray: true })
  data!: AdminSessionResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class AdminSessionListApiResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminSessionPaginatedDataDto })
  data!: AdminSessionPaginatedDataDto;

  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}

export class RevokeSessionApiResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: RevokeSessionResponseDto })
  data!: RevokeSessionResponseDto;

  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}
