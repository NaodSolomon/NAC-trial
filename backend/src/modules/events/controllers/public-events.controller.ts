import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { Throttle } from '@nestjs/throttler';
import { CreateRsvpDto, EventLanguageQueryDto, EventQueryDto } from '../dto/event.dto';
import { EventsService } from '../services/events.service';

@Controller('public/events')
export class PublicEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  list(@Query() query: EventQueryDto) {
    return this.eventsService.listPublic(query);
  }

  @Get(':slug')
  detail(@Param('slug') slug: string, @Query() query: EventLanguageQueryDto) {
    return this.eventsService.findPublic(slug, query.languageCode);
  }

  @Get(':slug/calendar.ics')
  async calendar(
    @Param('slug') slug: string,
    @Query() query: EventLanguageQueryDto,
    @Res() reply: FastifyReply,
  ) {
    const calendar = await this.eventsService.calendar(slug, query.languageCode);
    return reply
      .header('Content-Type', 'text/calendar; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${slug}.ics"`)
      .send(calendar);
  }

  @Post(':id/rsvp')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  rsvp(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: CreateRsvpDto) {
    return this.eventsService.rsvp(id, dto);
  }
}
