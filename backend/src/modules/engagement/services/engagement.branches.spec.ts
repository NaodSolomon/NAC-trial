import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CmsPagesService } from '../../cms/services/cms-pages.service';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { EngagementRepository } from '../interfaces/engagement-repository.interface';
import { EngagementService } from './engagement.service';

const actor: AdminPrincipal = {
  id: '77777777-7777-4777-8777-777777777777',
  name: 'Editor',
  email: 'editor@example.org',
  role: 'CONTENT_EDITOR',
};

describe('EngagementService branch behaviour', () => {
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
    } as unknown as jest.Mocked<EngagementRepository>;
    pages = { findPublicPage: jest.fn() };
    service = new EngagementService(repository, pages as unknown as CmsPagesService);
  });

  describe('updateTestimonial', () => {
    it('refuses an empty payload', async () => {
      await expect(service.updateTestimonial('id', {}, actor)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.updateTestimonial).not.toHaveBeenCalled();
    });

    it('forwards only the supplied fields, trimming text', async () => {
      repository.updateTestimonial.mockResolvedValue({ id: 'id' } as never);

      await service.updateTestimonial('id', { name: '  Parent  ', text: '  Story  ' }, actor);

      expect(repository.updateTestimonial).toHaveBeenCalledWith(
        'id',
        { name: 'Parent', text: 'Story' },
        actor.id,
      );
    });

    it('forwards a status change on its own', async () => {
      repository.updateTestimonial.mockResolvedValue({ id: 'id' } as never);

      await service.updateTestimonial('id', { status: 'APPROVED' } as never, actor);

      expect(repository.updateTestimonial).toHaveBeenCalledWith(
        'id',
        { status: 'APPROVED' },
        actor.id,
      );
    });

    it('reports a testimonial that does not exist', async () => {
      repository.updateTestimonial.mockResolvedValue(null as never);

      await expect(
        service.updateTestimonial('id', { name: 'Parent' }, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('reports a missing testimonial on delete', async () => {
    repository.deleteTestimonial.mockResolvedValue(false as never);

    await expect(service.deleteTestimonial('id', actor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('confirms a deleted testimonial', async () => {
    repository.deleteTestimonial.mockResolvedValue(true as never);

    await expect(service.deleteTestimonial('id', actor)).resolves.toEqual({
      message: 'Testimonial deleted successfully',
    });
  });

  describe('subscribe', () => {
    it('normalises the address before storing it', async () => {
      repository.createSubscriber.mockResolvedValue(undefined as never);

      await expect(
        service.subscribe({ email: '  Family@Example.ORG ', languageCode: 'en' } as never),
      ).resolves.toEqual({ status: 'subscribed' });

      expect(repository.createSubscriber).toHaveBeenCalledWith({
        email: 'family@example.org',
        languageCode: 'en',
      });
    });

    it.each([
      ['a direct code', { code: '23505' }],
      ['a wrapped code', { cause: { code: '23505' } }],
    ])('treats %s as an idempotent repeat subscription', async (_label, rejection) => {
      repository.createSubscriber.mockRejectedValue(rejection);

      await expect(
        service.subscribe({ email: 'family@example.org', languageCode: 'en' } as never),
      ).resolves.toEqual({ status: 'subscribed' });
    });

    it.each([
      ['a plain error', new Error('offline')],
      ['a null rejection', null],
      ['an unrelated code', { code: '42P01' }],
      ['a non-object cause', { cause: 'nope' }],
      ['a null cause', { cause: null }],
      ['a cause without a code', { cause: {} }],
    ])('surfaces %s to the caller', async (_label, rejection) => {
      repository.createSubscriber.mockRejectedValue(rejection);

      await expect(
        service.subscribe({ email: 'family@example.org', languageCode: 'en' } as never),
      ).rejects.toBeDefined();
    });
  });

  describe('deleteSubscriber', () => {
    it('normalises the address before deleting', async () => {
      repository.deleteSubscriber.mockResolvedValue(true as never);

      await expect(service.deleteSubscriber('  Family@Example.ORG ', actor)).resolves.toEqual({
        message: 'Newsletter subscriber deleted successfully',
      });

      expect(repository.deleteSubscriber).toHaveBeenCalledWith('family@example.org', actor.id);
    });

    it('reports an address that was never subscribed', async () => {
      repository.deleteSubscriber.mockResolvedValue(false as never);

      await expect(service.deleteSubscriber('nobody@example.org', actor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createTestimonial', () => {
    it.each([
      ['a direct code', { code: '23505' }],
      ['a wrapped code', { cause: { code: '23505' } }],
    ])('translates %s into a translation conflict', async (_label, rejection) => {
      repository.createTestimonial.mockRejectedValue(rejection);

      await expect(
        service.createTestimonial(
          { name: 'Parent', text: 'Story', languageCode: 'en' } as never,
          actor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows an unrelated failure', async () => {
      repository.createTestimonial.mockRejectedValue(new Error('offline'));

      await expect(
        service.createTestimonial(
          { name: 'Parent', text: 'Story', languageCode: 'en' } as never,
          actor,
        ),
      ).rejects.not.toBeInstanceOf(ConflictException);
    });
  });
});
