import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { AUDIT_LOG_REPOSITORY } from './interfaces/audit-log-repository.interface';
import { DrizzleAuditLogRepository } from './repositories/drizzle-audit-log.repository';
import { AuditLogsService } from './services/audit-logs.service';

@Module({
  imports: [AuthModule],
  controllers: [AuditLogsController],
  providers: [
    AuditLogsService,
    RolesGuard,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: DrizzleAuditLogRepository,
    },
  ],
})
export class AuditModule {}
