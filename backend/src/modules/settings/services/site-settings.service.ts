import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SiteSetting } from '../../../database/schema';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { ApplicationCache, CACHE, NOOP_CACHE } from '../../cache/cache.interface';
import { UpdateSiteSettingsDto } from '../dto/update-site-settings.dto';
import {
  SITE_SETTINGS_REPOSITORY,
  SiteSettingsRepository,
} from '../interfaces/site-settings-repository.interface';
import { PublicSiteSettings } from '../interfaces/settings.types';

@Injectable()
export class SiteSettingsService {
  constructor(
    @Inject(SITE_SETTINGS_REPOSITORY)
    private readonly settings: SiteSettingsRepository,
    @Inject(CACHE) private readonly cache: ApplicationCache = NOOP_CACHE,
  ) {}

  async getPublic(): Promise<PublicSiteSettings> {
    return this.cache.remember('settings', 'public', 300, async () =>
      this.toPublic(await this.get()),
    );
  }

  getAdmin(): Promise<SiteSetting> {
    return this.get();
  }

  async update(dto: UpdateSiteSettingsDto, actor: AdminPrincipal): Promise<SiteSetting> {
    if (!Object.keys(dto).length) {
      throw new BadRequestException('At least one field must be provided');
    }

    const current = await this.get();
    const supportedLanguages = dto.supportedLanguages ?? current.supportedLanguages;
    const defaultLanguage = dto.defaultLanguage ?? current.defaultLanguage;

    if (!supportedLanguages.includes(defaultLanguage)) {
      throw new BadRequestException('defaultLanguage must be included in supportedLanguages');
    }

    const updated = await this.settings.update(
      {
        ...(dto.siteName !== undefined && {
          siteName: dto.siteName.trim(),
        }),
        ...(dto.defaultLanguage !== undefined && {
          defaultLanguage: dto.defaultLanguage,
        }),
        ...(dto.supportedLanguages !== undefined && {
          supportedLanguages: [...new Set(dto.supportedLanguages)],
        }),
        ...(dto.contactEmail !== undefined && {
          contactEmail: dto.contactEmail.trim().toLowerCase(),
        }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() }),
        ...(dto.address !== undefined && { address: dto.address.trim() }),
      },
      actor.id,
    );

    if (!updated) {
      throw new NotFoundException('Global site settings were not found');
    }

    await this.cache.invalidate('settings');
    return updated;
  }

  private async get(): Promise<SiteSetting> {
    const settings = await this.settings.get();

    if (!settings) {
      throw new NotFoundException('Global site settings are missing; run the database seed');
    }

    return settings;
  }

  private toPublic(settings: SiteSetting): PublicSiteSettings {
    return {
      siteName: settings.siteName,
      defaultLanguage: settings.defaultLanguage,
      supportedLanguages: settings.supportedLanguages,
      contactEmail: settings.contactEmail,
      phone: settings.phone,
      address: settings.address,
    };
  }
}
