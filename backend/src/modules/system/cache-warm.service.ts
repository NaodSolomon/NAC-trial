import { Injectable } from '@nestjs/common';
import { NavigationService } from '../navigation/services/navigation.service';
import { SiteSettingsService } from '../settings/services/site-settings.service';

@Injectable()
export class CacheWarmService {
  constructor(
    private readonly settings: SiteSettingsService,
    private readonly navigation: NavigationService,
  ) {}

  async warm() {
    await Promise.all([
      this.settings.getPublic(),
      this.navigation.publicList('en'),
      this.navigation.publicList('am'),
    ]);
    return { warmed: ['settings:public', 'navigation:en', 'navigation:am'] };
  }
}
