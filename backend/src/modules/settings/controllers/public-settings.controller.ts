import { Controller, Get } from '@nestjs/common';
import { PublicSiteSettings } from '../interfaces/settings.types';
import { SiteSettingsService } from '../services/site-settings.service';

@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly settingsService: SiteSettingsService) {}

  @Get()
  get(): Promise<PublicSiteSettings> {
    return this.settingsService.getPublic();
  }
}
