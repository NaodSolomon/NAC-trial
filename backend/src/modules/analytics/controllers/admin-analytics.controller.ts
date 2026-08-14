import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  AnalyticsSummaryApiResponseDto,
  AnalyticsTimelineApiResponseDto,
  AnalyticsTimelineQueryDto,
} from '../dto/analytics.dto';
import { AnalyticsService } from '../services/analytics.service';

@Controller('admin/analytics')
@ApiTags('Admin Analytics')
@ApiBearerAuth('admin-jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get the complete cross-feature analytics summary' })
  @ApiOkResponse({ type: AnalyticsSummaryApiResponseDto })
  summary() {
    return this.analyticsService.summary();
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get daily page, form, resource, and donation trends' })
  @ApiOkResponse({ type: AnalyticsTimelineApiResponseDto })
  timeline(@Query() query: AnalyticsTimelineQueryDto) {
    return this.analyticsService.timeline(query);
  }
}
