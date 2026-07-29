import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { AdminsController } from './controllers/admins.controller';
import { ADMIN_MANAGEMENT_REPOSITORY } from './interfaces/admin-management-repository.interface';
import { DrizzleAdminManagementRepository } from './repositories/drizzle-admin-management.repository';
import { AdminsService } from './services/admins.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminsController],
  providers: [
    AdminsService,
    RolesGuard,
    {
      provide: ADMIN_MANAGEMENT_REPOSITORY,
      useClass: DrizzleAdminManagementRepository,
    },
  ],
})
export class AdminsModule {}
