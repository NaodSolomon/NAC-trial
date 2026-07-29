import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PaginatedResult } from '../../../common/types/api-response.type';
import { AuditLog } from '../../../database/schema';
import { AuditLogQueryDto } from '../dto/audit-log-query.dto';
import { AuditLogsService } from '../services/audit-logs.service';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  list(@Query() query: AuditLogQueryDto): Promise<PaginatedResult<AuditLog>> {
    return this.auditLogsService.list(query);
  }
}
