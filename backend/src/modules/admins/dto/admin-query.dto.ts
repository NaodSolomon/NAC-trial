import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { AdminRole } from '../../auth/interfaces/auth.types';

const ADMIN_ROLES: AdminRole[] = ['SUPER_ADMIN', 'CONTENT_EDITOR', 'FINANCE_VIEWER'];

export class AdminQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(ADMIN_ROLES)
  role?: AdminRole;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
