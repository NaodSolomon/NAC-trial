import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
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

  @Post(':id/rsvp')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  rsvp(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: CreateRsvpDto) {
    return this.eventsService.rsvp(id, dto);
  }
}
