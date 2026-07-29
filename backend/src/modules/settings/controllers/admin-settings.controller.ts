import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { SiteSetting } from '../../../database/schema';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { UpdateSiteSettingsDto } from '../dto/update-site-settings.dto';
import { SiteSettingsService } from '../services/site-settings.service';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminSettingsController {
  constructor(private readonly settingsService: SiteSettingsService) {}

  @Get()
  get(): Promise<SiteSetting> {
    return this.settingsService.getAdmin();
  }

  @Patch()
  update(
    @Body() dto: UpdateSiteSettingsDto,
    @CurrentAdmin() actor: AdminPrincipal,
  ): Promise<SiteSetting> {
    return this.settingsService.update(dto, actor);
  }
}
