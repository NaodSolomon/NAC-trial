import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventRepository } from '../interfaces/event-repository.interface';

describe('EventsService', () => {
  const event = {
    id: 'event-id',
    translationKey: 'translation-id',
    slug: 'workshop',
    title: 'Workshop',
    description: 'Description',
    startDate: new Date(Date.now() + 60_000),
    endDate: new Date(Date.now() + 120_000),
    location: 'Addis Ababa',
    rsvpEnabled: true,
    status: 'PUBLISHED' as const,
    languageCode: 'en' as const,
    createdBy: 'admin-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let repository: jest.Mocked<EventRepository>;
  let service: EventsService;

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      findPublicBySlug: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createRsvp: jest.fn(),
      listRsvps: jest.fn(),
      allRsvps: jest.fn(),
    };
    service = new EventsService(repository);
  });

  it('rejects an invalid event date range', async () => {
    await expect(
      service.create(
        {
          slug: 'workshop',
          title: 'Workshop',
          description: 'Description',
          startDate: '2026-08-02T10:00:00Z',
          endDate: '2026-08-02T09:00:00Z',
          location: 'Addis Ababa',
          rsvpEnabled: true,
          status: 'DRAFT',
          languageCode: 'en',
        },
        { id: 'admin-id', email: 'admin@example.com', name: 'Admin', role: 'SUPER_ADMIN' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects RSVP when it is disabled', async () => {
    repository.findById.mockResolvedValue({ ...event, rsvpEnabled: false });
    await expect(
      service.rsvp('event-id', { name: 'John Doe', email: 'john@example.com', attendees: 2 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hides draft events from public RSVP', async () => {
    repository.findById.mockResolvedValue({ ...event, status: 'DRAFT' });
    await expect(
      service.rsvp('event-id', { name: 'John Doe', email: 'john@example.com', attendees: 2 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('generates an interoperable iCalendar event for published content', async () => {
    repository.findPublicBySlug.mockResolvedValue({
      ...event,
      title: 'Family, Workshop',
      description: 'Line one\nLine two',
      status: 'PUBLISHED',
    });
    const calendar = await service.calendar('family-workshop', 'en');
    expect(calendar).toContain('BEGIN:VCALENDAR\r\n');
    expect(calendar).toContain('SUMMARY:Family\\, Workshop');
    expect(calendar).toContain('DESCRIPTION:Line one\\nLine two');
    expect(calendar).toContain('END:VCALENDAR\r\n');
  });

  it('maps duplicate RSVP email to a conflict', async () => {
    repository.findById.mockResolvedValue(event);
    repository.createRsvp.mockRejectedValue({ code: '23505' });
    await expect(
      service.rsvp('event-id', { name: 'John Doe', email: 'JOHN@example.com', attendees: 2 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
