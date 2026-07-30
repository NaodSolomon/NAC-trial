import { Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminPrincipal } from '../auth/interfaces/auth.types';
import { CacheAdministrationService } from './cache-administration.service';

@Controller('admin/cache')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminCacheController {
  constructor(private readonly cacheAdministration: CacheAdministrationService) {}

  @Post('clear')
  clear(@CurrentAdmin() actor: AdminPrincipal) {
    return this.cacheAdministration.clear(actor);
  }

  @Post('warm')
  warm(@CurrentAdmin() actor: AdminPrincipal) {
    return this.cacheAdministration.warm(actor);
  }
}
