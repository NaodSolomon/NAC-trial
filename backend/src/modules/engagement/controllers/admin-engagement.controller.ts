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
  UseGuards,
} from '@nestjs/common';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { CreateTestimonialDto } from '../dto/create-testimonial.dto';
import { NewsletterEmailParamDto, NewsletterQueryDto } from '../dto/newsletter.dto';
import { AdminTestimonialQueryDto } from '../dto/testimonial-query.dto';
import { UpdateTestimonialDto } from '../dto/update-testimonial.dto';
import { VolunteerApplicationQueryDto } from '../dto/volunteer-application-query.dto';
import { EngagementService } from '../services/engagement.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'CONTENT_EDITOR')
export class AdminEngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  @Get('volunteers')
  applications(@Query() query: VolunteerApplicationQueryDto) {
    return this.engagementService.listApplications(query);
  }

  @Delete('volunteers/:id')
  @Roles('SUPER_ADMIN')
  deleteApplication(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() actor: AdminPrincipal,
  ) {
    return this.engagementService.deleteApplication(id, actor);
  }

  @Get('testimonials')
  testimonials(@Query() query: AdminTestimonialQueryDto) {
    return this.engagementService.listAdminTestimonials(query);
  }

  @Post('testimonials')
  createTestimonial(@Body() dto: CreateTestimonialDto, @CurrentAdmin() actor: AdminPrincipal) {
    return this.engagementService.createTestimonial(dto, actor);
  }

  @Patch('testimonials/:id')
  updateTestimonial(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTestimonialDto,
    @CurrentAdmin() actor: AdminPrincipal,
  ) {
    return this.engagementService.updateTestimonial(id, dto, actor);
  }

  @Delete('testimonials/:id')
  deleteTestimonial(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() actor: AdminPrincipal,
  ) {
    return this.engagementService.deleteTestimonial(id, actor);
  }

  @Get('newsletter')
  @Roles('SUPER_ADMIN')
  subscribers(@Query() query: NewsletterQueryDto) {
    return this.engagementService.listSubscribers(query);
  }

  @Delete('newsletter/:email')
  @Roles('SUPER_ADMIN')
  deleteSubscriber(
    @Param() params: NewsletterEmailParamDto,
    @CurrentAdmin() actor: AdminPrincipal,
  ) {
    return this.engagementService.deleteSubscriber(params.email, actor);
  }
}
