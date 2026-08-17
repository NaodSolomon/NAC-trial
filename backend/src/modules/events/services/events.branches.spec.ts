import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { ApplicationCache } from '../../cache/cache.interface';
import { DatabaseUnavailableError } from '../../../database/database-unavailable.error';
import { EventRepository } from '../interfaces/event-repository.interface';
import { EventsService } from './events.service';

const actor: AdminPrincipal = {
  id: '55555555-5555-4555-8555-555555555555',
  name: 'Editor',
  email: 'editor@example.org',
  role: 'CONTENT_EDITOR',
};

const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);

function eventWith(overrides: Record<string, unknown> = {}) {
  return {
    id: '66666666-6666-4666-8666-666666666666',
    slug: 'family-day',
    title: 'Family day',
    description: 'An inclusive activity.',
    startDate: new Date(Date.now() + 3_600_000),
    endDate: future,
    location: 'Addis Ababa',
    rsvpEnabled: true,
    status: 'PUBLISHED',
    languageCode: 'en',
    ...overrides,
  } as never;
}

describe('EventsService branch behaviour', () => {
  let events: jest.Mocked<EventRepository>;
  let cache: jest.Mocked<ApplicationCache>;
  let service: EventsService;

  beforeEach(() => {
    events = {
      list: jest.fn(),
      findById: jest.fn(),
      findPublicBySlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createRsvp: jest.fn(),
      listRsvps: jest.fn(),
      allRsvps: jest.fn(),
    } as unknown as jest.Mocked<EventRepository>;
    cache = {
      remember: jest.fn(async (_ns, _key, _ttl, loader: () => unknown) => loader()),
      invalidate: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<ApplicationCache>;
    service = new EventsService(events, cache);
  });

  it('reports a missing published event', async () => {
    events.findPublicBySlug.mockResolvedValue(undefined as never);

    await expect(service.findPublic('missing', 'en')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a published event when the cache resolves one', async () => {
    events.findPublicBySlug.mockResolvedValue(eventWith());

    await expect(service.findPublic('family-day', 'en')).resolves.toMatchObject({
      slug: 'family-day',
    });
  });

  it('translates a database outage into a service-unavailable response', async () => {
    events.list.mockRejectedValue(new DatabaseUnavailableError('list', new Error('pool down')));

    await expect(service.listPublic({} as never)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rethrows an unrelated listing failure', async () => {
    events.list.mockRejectedValue(new Error('unexpected'));

    await expect(service.listPublic({} as never)).rejects.not.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  describe('update', () => {
    it('refuses an empty payload', async () => {
      await expect(service.update('id', {}, actor)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an end date that is not after the start date', async () => {
      events.findById.mockResolvedValue(eventWith());

      await expect(
        service.update(
          'id',
          { startDate: future.toISOString(), endDate: future.toISOString() },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('validates a new start date against the stored end date', async () => {
      events.findById.mockResolvedValue(eventWith({ endDate: future }));
      events.update.mockResolvedValue(eventWith());

      await service.update('id', { startDate: new Date(Date.now() + 1_000).toISOString() }, actor);

      expect(events.update).toHaveBeenCalled();
    });

    it('forwards only the supplied fields, trimming text', async () => {
      events.findById.mockResolvedValue(eventWith());
      events.update.mockResolvedValue(eventWith());

      await service.update(
        'id',
        { title: '  Renamed  ', description: '  Body  ', location: '  Hall  ' },
        actor,
      );

      expect(events.update).toHaveBeenCalledWith(
        'id',
        { title: 'Renamed', description: 'Body', location: 'Hall' },
        actor.id,
      );
    });

    it('forwards slug, rsvp and status changes', async () => {
      events.findById.mockResolvedValue(eventWith());
      events.update.mockResolvedValue(eventWith());

      await service.update('id', { slug: 'new', rsvpEnabled: false, status: 'DRAFT' }, actor);

      expect(events.update).toHaveBeenCalledWith(
        'id',
        { slug: 'new', rsvpEnabled: false, status: 'DRAFT' },
        actor.id,
      );
    });

    it.each([
      ['a direct code', { code: '23505' }],
      ['a wrapped code', { cause: { code: '23505' } }],
    ])('translates %s into a slug conflict', async (_label, rejection) => {
      events.findById.mockResolvedValue(eventWith());
      events.update.mockRejectedValue(rejection);

      await expect(service.update('id', { title: 'x' }, actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it.each([
      ['a plain error', new Error('offline')],
      ['a null rejection', null],
      ['an unrelated code', { code: '42P01' }],
      ['a non-object cause', { cause: 'nope' }],
      ['a cause without a code', { cause: {} }],
    ])('rethrows %s untouched', async (_label, rejection) => {
      events.findById.mockResolvedValue(eventWith());
      events.update.mockRejectedValue(rejection);

      await expect(service.update('id', { title: 'x' }, actor)).rejects.not.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  it('reports a missing event on delete', async () => {
    events.delete.mockResolvedValue(false as never);

    await expect(service.delete('id', actor)).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('rsvp', () => {
    it('refuses an unpublished event', async () => {
      events.findById.mockResolvedValue(eventWith({ status: 'DRAFT' }));

      await expect(service.rsvp('id', {} as never)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses an event with RSVP switched off', async () => {
      events.findById.mockResolvedValue(eventWith({ rsvpEnabled: false }));

      await expect(service.rsvp('id', {} as never)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses an event that has already ended', async () => {
      events.findById.mockResolvedValue(eventWith({ endDate: past }));

      await expect(service.rsvp('id', {} as never)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('normalises the attendee details', async () => {
      events.findById.mockResolvedValue(eventWith());
      events.createRsvp.mockResolvedValue(undefined as never);

      await expect(
        service.rsvp('id', {
          name: '  Family  ',
          email: '  FAMILY@Example.ORG ',
          attendees: 3,
        } as never),
      ).resolves.toEqual({ status: 'confirmed' });

      expect(events.createRsvp).toHaveBeenCalledWith({
        eventId: 'id',
        name: 'Family',
        email: 'family@example.org',
        attendees: 3,
      });
    });

    it('reports a duplicate RSVP as a conflict', async () => {
      events.findById.mockResolvedValue(eventWith());
      events.createRsvp.mockRejectedValue({ code: '23505' });

      await expect(
        service.rsvp('id', { name: 'A', email: 'a@b.c', attendees: 1 } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows an unrelated RSVP failure', async () => {
      events.findById.mockResolvedValue(eventWith());
      events.createRsvp.mockRejectedValue(new Error('offline'));

      await expect(
        service.rsvp('id', { name: 'A', email: 'a@b.c', attendees: 1 } as never),
      ).rejects.not.toBeInstanceOf(ConflictException);
    });
  });
});
