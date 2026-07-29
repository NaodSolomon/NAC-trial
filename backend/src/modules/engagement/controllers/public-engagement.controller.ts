import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreateVolunteerApplicationDto } from '../dto/create-volunteer-application.dto';
import { LanguageQueryDto } from '../dto/language-query.dto';
import { NewsletterSignupDto } from '../dto/newsletter.dto';
import { PublicTestimonialQueryDto } from '../dto/testimonial-query.dto';
import { EngagementService } from '../services/engagement.service';

@Controller('public')
export class PublicEngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  @Get('volunteer')
  volunteerPage(@Query() query: LanguageQueryDto) {
    return this.engagementService.getVolunteerPage(query.languageCode);
  }

  @Post('volunteer/apply')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  apply(@Body() dto: CreateVolunteerApplicationDto) {
    return this.engagementService.apply(dto);
  }

  @Get('testimonials')
  testimonials(@Query() query: PublicTestimonialQueryDto) {
    return this.engagementService.listPublicTestimonials(query);
  }

  @Post('newsletter')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  subscribe(@Body() dto: NewsletterSignupDto) {
    return this.engagementService.subscribe(dto);
  }
}
