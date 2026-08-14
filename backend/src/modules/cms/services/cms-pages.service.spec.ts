import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CmsPage } from '../../../database/schema';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { CmsPageRepository } from '../interfaces/cms-page-repository.interface';
import { CmsPagesService } from './cms-pages.service';

const actor: AdminPrincipal = {
  id: '2a15a8e4-71c4-4bd0-b250-bc425b76fa8f',
  name: 'Content Editor',
  email: 'editor@example.com',
  role: 'CONTENT_EDITOR',
};

function page(slug: string, metadata: Record<string, unknown>): CmsPage {
  const now = new Date();
  return {
    id: '00000000-0000-4000-8000-000000000101',
    translationKey: '00000000-0000-4000-8000-000000000102',
    slug,
    languageCode: 'en',
    title: slug,
    content: 'Draft content',
    status: 'DRAFT',
    metadata,
    seoTitle: null,
    seoDescription: null,
    seoImageUrl: null,
    seoKeywords: [],
    createdBy: actor.id,
    scheduledAt: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe('CmsPagesService', () => {
  let pages: jest.Mocked<CmsPageRepository>;
  let service: CmsPagesService;

  beforeEach(() => {
    pages = {
      list: jest.fn(),
      findById: jest.fn(),
      findPublished: jest.fn(),
      isSlugAvailable: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      publish: jest.fn(),
      schedule: jest.fn(),
      delete: jest.fn(),
      publishScheduled: jest.fn(),
    };
    service = new CmsPagesService(pages);
  });

  it('rejects publishing schedules that are not in the future', async () => {
    await expect(
      service.schedule('page-id', new Date(0).toISOString(), actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(pages.schedule).not.toHaveBeenCalled();
  });

  it('converts database uniqueness failures into a stable conflict response', async () => {
    pages.create.mockRejectedValue({ code: '23505' });

    await expect(
      service.create(
        {
          slug: 'about-us',
          languageCode: 'en',
          title: 'About us',
          content: 'Content',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not expose unpublished or missing content through public reads', async () => {
    pages.findPublished.mockResolvedValue(null);

    await expect(service.findPublicPage('draft-page', 'en')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each([
    page('about', { contentApproved: false, about: {} }),
    page('team', { contentApproved: true, teamMembers: [] }),
  ])('refuses to publish incomplete or unapproved launch content', async (draft) => {
    pages.findById.mockResolvedValue(draft);

    await expect(service.publish(draft.id, actor)).rejects.toBeInstanceOf(BadRequestException);
    expect(pages.publish).not.toHaveBeenCalled();
  });

  it('allows an explicitly approved team page with biographies to publish', async () => {
    const approved = page('team', {
      contentApproved: true,
      teamMembers: [{ name: 'Approved', role: 'Role', biography: 'Approved biography.' }],
    });
    pages.findById.mockResolvedValue(approved);
    pages.publish.mockResolvedValue({
      ...approved,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });

    await expect(service.publish(approved.id, actor)).resolves.toMatchObject({
      status: 'PUBLISHED',
    });
  });
});
