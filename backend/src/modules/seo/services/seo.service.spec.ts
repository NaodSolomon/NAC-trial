import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { ApplicationCache } from '../../cache/cache.interface';
import { SeoRepository } from '../interfaces/seo-repository.interface';
import { SeoRecord } from '../interfaces/seo-response.interface';
import { SeoService } from './seo.service';

const actor: AdminPrincipal = {
  id: 'd5396ac9-0652-4462-9f7d-5636bb463b48',
  name: 'Content Editor',
  email: 'editor@example.org',
  role: 'CONTENT_EDITOR',
};
const record: SeoRecord = {
  id: '30356aae-88e7-4b03-ae1f-2a01c81a7d8a',
  slug: 'home',
  languageCode: 'en',
  pageTitle: 'Homepage fallback title',
  seoTitle: null,
  seoDescription: null,
  seoKeywords: [],
  seoImageUrl: null,
};

describe('SeoService', () => {
  let repository: jest.Mocked<SeoRepository>;
  let cache: jest.Mocked<ApplicationCache>;
  let service: SeoService;

  beforeEach(() => {
    repository = {
      findPublished: jest.fn(),
      update: jest.fn(),
    };
    cache = {
      ping: jest.fn(),
      remember: jest.fn(async (_namespace, _key, _ttl, loader) => loader()),
      invalidate: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<ApplicationCache>;
    service = new SeoService(repository, cache);
  });

  it('caches published SEO and applies the documented fallbacks', async () => {
    repository.findPublished.mockResolvedValue(record);

    await expect(service.findPublic('home', 'en')).resolves.toEqual({
      slug: 'home',
      languageCode: 'en',
      title: 'Homepage fallback title',
      description: null,
      keywords: [],
      imageUrl: null,
    });
    expect(cache.remember).toHaveBeenCalledWith('cms', 'seo:en:home', 300, expect.any(Function));
  });

  it('returns 404 when no published SEO record exists', async () => {
    repository.findPublished.mockResolvedValue(null);

    await expect(service.findPublic('draft', 'en')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps updates to CMS SEO columns and invalidates CMS cache after success', async () => {
    repository.update.mockResolvedValue({
      ...record,
      seoTitle: 'Autism Awareness Ethiopia',
      seoKeywords: ['autism', 'ethiopia'],
    });

    await service.update(
      'home',
      {
        languageCode: 'en',
        title: 'Autism Awareness Ethiopia',
        keywords: ['autism', 'ethiopia'],
      },
      actor,
    );

    expect(repository.update).toHaveBeenCalledWith(
      'home',
      'en',
      {
        seoTitle: 'Autism Awareness Ethiopia',
        seoKeywords: ['autism', 'ethiopia'],
      },
      actor.id,
    );
    expect(cache.invalidate).toHaveBeenCalledWith('cms');
  });

  it('requires at least one SEO field and never invalidates cache for failed updates', async () => {
    await expect(service.update('home', { languageCode: 'en' }, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    repository.update.mockResolvedValue(null);
    await expect(
      service.update('missing', { languageCode: 'en', title: 'Valid title' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(cache.invalidate).not.toHaveBeenCalled();
  });
});
