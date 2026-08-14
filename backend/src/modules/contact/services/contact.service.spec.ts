import { NotFoundException } from '@nestjs/common';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { CmsPagesService } from '../../cms/services/cms-pages.service';
import { SiteSettingsService } from '../../settings/services/site-settings.service';
import { ContactRepository } from '../interfaces/contact-repository.interface';
import { ContactService } from './contact.service';

const now = new Date();
const actor: AdminPrincipal = {
  id: '2a15a8e4-71c4-4bd0-b250-bc425b76fa8f',
  name: 'Super Admin',
  email: 'owner@example.com',
  role: 'SUPER_ADMIN',
};

describe('ContactService', () => {
  let contacts: jest.Mocked<ContactRepository>;
  let pages: { findPublicPage: jest.Mock };
  let settings: { getPublic: jest.Mock };
  let service: ContactService;

  beforeEach(() => {
    contacts = {
      create: jest.fn().mockImplementation(async (data) => ({
        id: '239fc6d9-31f8-47fd-958d-c3a69b2c9ec7',
        subject: null,
        createdAt: now,
        ...data,
      })),
      findById: jest.fn(),
      list: jest.fn(),
      delete: jest.fn(),
    };
    pages = {
      findPublicPage: jest.fn().mockResolvedValue({
        title: 'Contact us',
        content: 'How to reach the center',
        languageCode: 'en',
        metadata: {
          mapEmbedUrl: 'https://maps.google.com/maps?q=Addis+Ababa',
        },
      }),
    };
    settings = {
      getPublic: jest.fn().mockResolvedValue({
        contactEmail: 'info@example.com',
        phone: '+251900000000',
        address: 'Addis Ababa',
      }),
    };
    service = new ContactService(
      contacts,
      pages as unknown as CmsPagesService,
      settings as unknown as SiteSettingsService,
    );
  });

  it('normalizes visitor data before persistence', async () => {
    await service.submit({
      name: '  Jane Doe  ',
      email: 'JANE@EXAMPLE.COM',
      subject: '  Services  ',
      message: '  Please send more information.  ',
      languageCode: 'en',
    });

    expect(contacts.create).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane@example.com',
      subject: 'Services',
      message: 'Please send more information.',
      languageCode: 'en',
    });
  });

  it('composes public contact content from CMS and global settings', async () => {
    await expect(service.getPublicPage('en')).resolves.toMatchObject({
      title: 'Contact us',
      email: 'info@example.com',
      mapEmbedUrl: 'https://maps.google.com/maps?q=Addis+Ababa',
    });
  });

  it('does not expose an arbitrary map embed origin from CMS metadata', async () => {
    pages.findPublicPage.mockResolvedValue({
      title: 'Contact us',
      content: 'Contact content',
      languageCode: 'en',
      metadata: { mapEmbedUrl: 'https://malicious.example/track' },
    });

    await expect(service.getPublicPage('en')).resolves.toMatchObject({
      mapEmbedUrl: null,
    });
  });

  it('reports a missing submission during deletion', async () => {
    contacts.delete.mockResolvedValue(false);

    await expect(
      service.delete('239fc6d9-31f8-47fd-958d-c3a69b2c9ec7', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
