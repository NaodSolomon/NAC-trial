import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { TrackAnalyticsEventDto } from '../dto/analytics.dto';
import { AnalyticsService } from '../services/analytics.service';

@Controller('public/analytics')
export class PublicAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  track(@Body() dto: TrackAnalyticsEventDto, @Headers('cf-ipcountry') country?: string) {
    return this.analyticsService.track(dto, country);
  }
}
