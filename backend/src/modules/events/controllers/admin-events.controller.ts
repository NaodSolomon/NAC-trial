import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { FastifyReply } from 'fastify';
import { CreateEventDto, EventQueryDto, RsvpQueryDto, UpdateEventDto } from '../dto/event.dto';
import { EventsService } from '../services/events.service';

@Controller('admin/events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'CONTENT_EDITOR')
export class AdminEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  list(@Query() query: EventQueryDto) {
    return this.eventsService.listAdmin(query);
  }

  @Post()
  create(@Body() dto: CreateEventDto, @CurrentAdmin() actor: AdminPrincipal) {
    return this.eventsService.create(dto, actor);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateEventDto,
    @CurrentAdmin() actor: AdminPrincipal,
  ) {
    return this.eventsService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  delete(@Param('id', new ParseUUIDPipe()) id: string, @CurrentAdmin() actor: AdminPrincipal) {
    return this.eventsService.delete(id, actor);
  }

  @Get(':id/rsvps')
  rsvps(@Param('id', new ParseUUIDPipe()) id: string, @Query() query: RsvpQueryDto) {
    return this.eventsService.listRsvps(id, query);
  }

  @Get(':id/rsvps/export')
  async export(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() reply: FastifyReply,
  ) {
    const csv = await this.eventsService.exportRsvps(id);
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="event-rsvps.csv"')
      .send(csv);
  }
}
