import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { CmsPagesService } from '../../cms/services/cms-pages.service';
import { EngagementRepository } from '../interfaces/engagement-repository.interface';
import { EngagementService } from './engagement.service';

const actor: AdminPrincipal = {
  id: '2a15a8e4-71c4-4bd0-b250-bc425b76fa8f',
  name: 'Content Editor',
  email: 'editor@example.com',
  role: 'CONTENT_EDITOR',
};

describe('EngagementService', () => {
  let repository: jest.Mocked<EngagementRepository>;
  let pages: { findPublicPage: jest.Mock };
  let service: EngagementService;

  beforeEach(() => {
    repository = {
      createApplication: jest.fn(),
      listApplications: jest.fn(),
      deleteApplication: jest.fn(),
      listTestimonials: jest.fn(),
      createTestimonial: jest.fn(),
      updateTestimonial: jest.fn(),
      deleteTestimonial: jest.fn(),
      createSubscriber: jest.fn(),
      listSubscribers: jest.fn(),
      deleteSubscriber: jest.fn(),
    };
    pages = {
      findPublicPage: jest.fn().mockResolvedValue({
        title: 'Volunteer with us',
        content: 'Join our mission.',
        languageCode: 'en',
      }),
    };
    service = new EngagementService(repository, pages as unknown as CmsPagesService);
  });

  it('composes the volunteer page from published CMS content', async () => {
    await expect(service.getVolunteerPage('en')).resolves.toEqual({
      title: 'Volunteer with us',
      description: 'Join our mission.',
      languageCode: 'en',
    });
    expect(pages.findPublicPage).toHaveBeenCalledWith('volunteer', 'en');
  });

  it('normalizes volunteer application data before persistence', async () => {
    await service.apply({
      name: '  Jane Doe  ',
      email: 'JANE@EXAMPLE.COM',
      phone: ' +251900000000 ',
      roleInterest: ' Therapy Assistant ',
      message: ' I would love to support the center. ',
      languageCode: 'en',
    });

    expect(repository.createApplication).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+251900000000',
      roleInterest: 'Therapy Assistant',
      message: 'I would love to support the center.',
      languageCode: 'en',
    });
  });

  it('forces public testimonial reads through the published-only repository path', async () => {
    await service.listPublicTestimonials({
      page: 1,
      limit: 20,
      offset: 0,
      sortOrder: 'desc',
      languageCode: 'am',
    });

    expect(repository.listTestimonials).toHaveBeenCalledWith(
      expect.objectContaining({ languageCode: 'am' }),
      true,
    );
  });

  it('treats duplicate newsletter signup as an idempotent success', async () => {
    repository.createSubscriber.mockRejectedValue({ code: '23505' });

    await expect(
      service.subscribe({
        email: 'USER@EXAMPLE.COM',
        languageCode: 'en',
      }),
    ).resolves.toEqual({ status: 'subscribed' });
  });

  it('rejects an empty testimonial update before repository access', async () => {
    await expect(service.updateTestimonial('testimonial-id', {}, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.updateTestimonial).not.toHaveBeenCalled();
  });

  it('reports a missing volunteer application during deletion', async () => {
    repository.deleteApplication.mockResolvedValue(false);

    await expect(
      service.deleteApplication('239fc6d9-31f8-47fd-958d-c3a69b2c9ec7', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
