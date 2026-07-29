import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ContactPageQueryDto } from '../dto/contact-page-query.dto';
import { CreateContactSubmissionDto } from '../dto/create-contact-submission.dto';
import { ContactService } from '../services/contact.service';

@Controller('public/contact')
export class PublicContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  getPage(@Query() query: ContactPageQueryDto) {
    return this.contactService.getPublicPage(query.languageCode);
  }

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submit(@Body() dto: CreateContactSubmissionDto) {
    return this.contactService.submit(dto);
  }
}
