import { BadRequestException } from '@nestjs/common';
import { SiteSetting } from '../../../database/schema';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { SiteSettingsRepository } from '../interfaces/site-settings-repository.interface';
import { SiteSettingsService } from './site-settings.service';

const now = new Date();
const actor: AdminPrincipal = {
  id: '2a15a8e4-71c4-4bd0-b250-bc425b76fa8f',
  name: 'Super Admin',
  email: 'owner@example.com',
  role: 'SUPER_ADMIN',
};
const settings: SiteSetting = {
  id: '239fc6d9-31f8-47fd-958d-c3a69b2c9ec7',
  key: 'global',
  siteName: 'Nehemiah Autism Center',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'am'],
  contactEmail: 'info@example.com',
  phone: null,
  address: null,
  socialLinks: {},
  defaultShareImageUrl: null,
  localizedText: {},
  pageBanners: {},
  updatedBy: actor.id,
  createdAt: now,
  updatedAt: now,
};

describe('SiteSettingsService', () => {
  let repository: jest.Mocked<SiteSettingsRepository>;
  let service: SiteSettingsService;

  beforeEach(() => {
    repository = {
      get: jest.fn().mockResolvedValue(settings),
      update: jest.fn(),
    };
    service = new SiteSettingsService(repository);
  });

  it('requires the default language to remain supported', async () => {
    await expect(service.update({ supportedLanguages: ['am'] }, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('normalizes settings before persistence', async () => {
    repository.update.mockResolvedValue(settings);

    await service.update(
      {
        siteName: '  Nehemiah Autism Center  ',
        contactEmail: 'INFO@EXAMPLE.COM',
        supportedLanguages: ['en', 'en', 'am'],
        socialLinks: { facebook: '  https://facebook.com/nehemiah  ' },
      },
      actor,
    );

    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        siteName: 'Nehemiah Autism Center',
        contactEmail: 'info@example.com',
        supportedLanguages: ['en', 'am'],
        socialLinks: { facebook: 'https://facebook.com/nehemiah' },
      }),
      actor.id,
    );
  });
});
