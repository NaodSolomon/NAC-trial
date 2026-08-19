import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SiteLocalizedText } from '../../../database/schema/site-setting.schema';
import { SiteSetting } from '../../../database/schema';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { ApplicationCache, CACHE, NOOP_CACHE } from '../../cache/cache.interface';
import { LocalizedTextDto, UpdateSiteSettingsDto } from '../dto/update-site-settings.dto';
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
        ...(dto.socialLinks !== undefined && {
          socialLinks: Object.fromEntries(
            Object.entries(dto.socialLinks)
              .map(([network, url]) => [network, url?.trim()])
              .filter((entry): entry is [string, string] => Boolean(entry[1])),
          ),
        }),
        ...(dto.defaultShareImageUrl !== undefined && {
          defaultShareImageUrl: dto.defaultShareImageUrl?.trim() || null,
        }),
        ...(dto.localizedText !== undefined && {
          localizedText: normalizeLocalizedText(dto.localizedText),
        }),
        ...(dto.pageBanners !== undefined && {
          pageBanners: Object.fromEntries(
            Object.entries(dto.pageBanners)
              .map(([pageKey, url]) => [pageKey, typeof url === 'string' ? url.trim() : ''])
              .filter((entry): entry is [string, string] => Boolean(entry[1])),
          ),
        }),
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
      socialLinks: settings.socialLinks,
      defaultShareImageUrl: settings.defaultShareImageUrl,
      localizedText: settings.localizedText,
      pageBanners: settings.pageBanners,
    };
  }
}

function normalizeLocalizedText(dto: LocalizedTextDto): SiteLocalizedText {
  const entries = Object.entries(dto).map(([key, value]) => {
    const en = value?.en?.trim();
    const am = value?.am?.trim();
    const localized = { ...(en && { en }), ...(am && { am }) };
    return [key, localized] as const;
  });
  return Object.fromEntries(entries.filter(([, value]) => Object.keys(value).length > 0));
}
