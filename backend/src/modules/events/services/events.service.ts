import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DatabaseUnavailableError } from '../../../database/database-unavailable.error';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { ApplicationCache, CACHE, NOOP_CACHE } from '../../cache/cache.interface';
import {
  CreateEventDto,
  CreateRsvpDto,
  EventQueryDto,
  RsvpQueryDto,
  UpdateEventDto,
} from '../dto/event.dto';
import { EVENT_REPOSITORY, EventRepository } from '../interfaces/event-repository.interface';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject(EVENT_REPOSITORY) private readonly events: EventRepository,
    @Inject(CACHE) private readonly cache: ApplicationCache = NOOP_CACHE,
  ) {}

  async listPublic(query: EventQueryDto) {
    try {
      return await this.cache.remember(
        'events',
        `list:${JSON.stringify(this.criteria(query))}`,
        120,
        () => this.events.list(this.criteria(query), true),
      );
    } catch (error) {
      this.rethrowListFailure(error);
    }
  }

  async listAdmin(query: EventQueryDto) {
    try {
      return await this.events.list(this.criteria(query), false);
    } catch (error) {
      this.rethrowListFailure(error);
    }
  }

  async findPublic(slug: string, languageCode: 'en' | 'am') {
    const event = await this.cache.remember('events', `detail:${languageCode}:${slug}`, 300, () =>
      this.events.findPublicBySlug(slug, languageCode),
    );
    if (!event) throw new NotFoundException(`Published event ${slug} was not found`);
    return event;
  }

  private rethrowListFailure(error: unknown): never {
    if (error instanceof DatabaseUnavailableError) {
      this.logger.warn(`Event listing unavailable operation=${error.operation}`);
      throw new ServiceUnavailableException('Events are temporarily unavailable', {
        cause: error,
      });
    }
    throw error;
  }

  async calendar(slug: string, languageCode: 'en' | 'am') {
    const event = await this.findPublic(slug, languageCode);
    const escape = (value: string) =>
      value.replaceAll('\\', '\\\\').replaceAll(',', '\\,').replaceAll(';', '\\;').replaceAll('\n', '\\n');
    const date = (value: Date | string) =>
      new Date(value).toISOString().replaceAll(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Nehemiah Autism Center//Events//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${event.id}@nehemiah.local`,
      `DTSTAMP:${date(new Date())}`,
      `DTSTART:${date(event.startDate)}`,
      `DTEND:${date(event.endDate)}`,
      `SUMMARY:${escape(event.title)}`,
      `DESCRIPTION:${escape(event.description)}`,
      `LOCATION:${escape(event.location)}`,
      `URL:/events/${event.slug}`,
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n');
  }

  async create(dto: CreateEventDto, actor: AdminPrincipal) {
    this.assertDateRange(dto.startDate, dto.endDate);
    try {
      const created = await this.events.create(
        {
          slug: dto.slug,
          title: dto.title.trim(),
          description: dto.description.trim(),
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          location: dto.location.trim(),
          rsvpEnabled: dto.rsvpEnabled,
          status: dto.status,
          languageCode: dto.languageCode,
          translationKey: dto.translationKey,
          imageUrl: dto.imageUrl?.trim() || null,
          createdBy: actor.id,
        },
        actor.id,
      );
      await this.cache.invalidate('events');
      return created;
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async update(id: string, dto: UpdateEventDto, actor: AdminPrincipal) {
    if (!Object.keys(dto).length)
      throw new BadRequestException('At least one field must be provided');
    const existing = await this.requireEvent(id);
    this.assertDateRange(
      dto.startDate ?? existing.startDate.toISOString(),
      dto.endDate ?? existing.endDate.toISOString(),
    );
    try {
      const updated = await this.events.update(
        id,
        {
          ...(dto.slug !== undefined && { slug: dto.slug }),
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.description !== undefined && { description: dto.description.trim() }),
          ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
          ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
          ...(dto.location !== undefined && { location: dto.location.trim() }),
          ...(dto.rsvpEnabled !== undefined && { rsvpEnabled: dto.rsvpEnabled }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl?.trim() || null }),
        },
        actor.id,
      );
      await this.cache.invalidate('events');
      return updated;
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async delete(id: string, actor: AdminPrincipal) {
    if (!(await this.events.delete(id, actor.id)))
      throw new NotFoundException(`Event ${id} was not found`);
    await this.cache.invalidate('events');
    return { deleted: true };
  }

  async rsvp(id: string, dto: CreateRsvpDto) {
    const event = await this.requireEvent(id);
    if (event.status !== 'PUBLISHED') throw new NotFoundException(`Event ${id} was not found`);
    if (!event.rsvpEnabled) throw new BadRequestException('RSVP is not enabled for this event');
    if (event.endDate <= new Date()) throw new BadRequestException('RSVP is closed for this event');
    try {
      await this.events.createRsvp({
        eventId: id,
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        attendees: dto.attendees,
      });
      return { status: 'confirmed' };
    } catch (error) {
      if (this.isUniqueViolation(error))
        throw new ConflictException('This email has already RSVP’d to the event');
      throw error;
    }
  }

  async listRsvps(id: string, query: RsvpQueryDto) {
    await this.requireEvent(id);
    return this.events.listRsvps(id, this.criteria(query));
  }

  async exportRsvps(id: string) {
    await this.requireEvent(id);
    const rows = await this.events.allRsvps(id);
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    return [
      'name,email,attendees,status,createdAt',
      ...rows.map((row) =>
        [row.name, row.email, row.attendees, row.status, row.createdAt.toISOString()]
          .map(escape)
          .join(','),
      ),
    ].join('\r\n');
  }

  private async requireEvent(id: string) {
    const event = await this.events.findById(id);
    if (!event) throw new NotFoundException(`Event ${id} was not found`);
    return event;
  }

  private assertDateRange(start: string, end: string) {
    if (new Date(end) <= new Date(start))
      throw new BadRequestException('endDate must be after startDate');
  }

  private criteria(query: EventQueryDto | RsvpQueryDto) {
    return {
      page: query.page,
      limit: query.limit,
      offset: query.offset,
      sortOrder: query.sortOrder,
      ...('languageCode' in query && {
        languageCode: query.languageCode,
        timeframe: query.timeframe,
        status: query.status,
      }),
    };
  }

  private rethrowUnique(error: unknown): never {
    if (this.isUniqueViolation(error))
      throw new ConflictException('An event with this slug or translation already exists');
    throw error;
  }

  private isUniqueViolation(error: unknown) {
    if (typeof error !== 'object' || error === null) return false;
    if ('code' in error && error.code === '23505') return true;
    return (
      'cause' in error &&
      typeof error.cause === 'object' &&
      error.cause !== null &&
      'code' in error.cause &&
      error.cause.code === '23505'
    );
  }
}
