import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { AdminSearchController } from './controllers/admin-search.controller';
import { SEARCH_MAINTENANCE_REPOSITORY } from './interfaces/search-maintenance-repository.interface';
import { SEARCH_REPOSITORY } from './interfaces/search-repository.interface';
import { PostgresSearchMaintenanceRepository } from './repositories/postgres-search-maintenance.repository';
import { DrizzleSearchRepository } from './repositories/drizzle-search.repository';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchAdministrationService } from './services/search-administration.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [SearchController, AdminSearchController],
  providers: [
    SearchService,
    SearchAdministrationService,
    RolesGuard,
    {
      provide: SEARCH_REPOSITORY,
      useClass: DrizzleSearchRepository,
    },
    {
      provide: SEARCH_MAINTENANCE_REPOSITORY,
      useClass: PostgresSearchMaintenanceRepository,
    },
  ],
})
export class SearchModule {}
