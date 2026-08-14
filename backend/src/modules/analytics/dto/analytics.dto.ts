import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackAnalyticsEventDto {
  @IsIn(['page_view', 'click', 'submit'])
  eventType!: 'page_view' | 'click' | 'submit';

  @IsString()
  @MaxLength(2048)
  @Matches(/^\/(?!\/)[^\s]*$/, { message: 'pageUrl must be a local site path' })
  pageUrl!: string;

  @IsOptional()
  @IsIn(['mobile', 'desktop', 'tablet', 'unknown'])
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown' = 'unknown';

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;
}

export class AnalyticsTimelineQueryDto {
  @ApiPropertyOptional({ enum: ['day', 'week', 'month'], default: 'month' })
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  range: 'day' | 'week' | 'month' = 'month';
}

class CountryVisitsDto {
  @ApiProperty({ example: 'ET' }) country!: string;
  @ApiProperty({ example: 42 }) visits!: number;
}

class PageVisitsDto {
  @ApiProperty({ example: '/services' }) route!: string;
  @ApiProperty({ example: 42 }) visits!: number;
}

class FormSummaryDto {
  @ApiProperty({ example: 40 }) totalSubmissions!: number;
  @ApiProperty({ example: 10 }) contact!: number;
  @ApiProperty({ example: 8 }) volunteer!: number;
  @ApiProperty({ example: 12 }) newsletter!: number;
  @ApiProperty({ example: 10 }) eventRsvp!: number;
}

class TopResourceDto {
  @ApiProperty({ format: 'uuid' }) resourceId!: string;
  @ApiProperty({ example: 'Family support guide' }) title!: string;
  @ApiProperty({ example: 20 }) downloads!: number;
}

class ResourceCountryDto {
  @ApiProperty({ example: 'ET' }) country!: string;
  @ApiProperty({ example: 18 }) downloads!: number;
}

class ResourceAnalyticsDto {
  @ApiProperty({ example: 30 }) totalDownloads!: number;
  @ApiProperty({ type: [TopResourceDto] }) topResources!: TopResourceDto[];
  @ApiProperty({ type: [ResourceCountryDto] }) topCountries!: ResourceCountryDto[];
}

class DonationStatusCountDto {
  @ApiProperty({ enum: ['INITIATED', 'PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'] })
  status!: string;
  @ApiProperty({ example: 5 }) count!: number;
}

class DonationValueDto {
  @ApiProperty({ enum: ['USD', 'ETB'] }) currency!: string;
  @ApiProperty({ example: '1250.00', description: 'Decimal string to preserve monetary precision' })
  amount!: string;
}

class DonationAnalyticsDto {
  @ApiProperty({ example: 15 }) totalDonations!: number;
  @ApiProperty({ type: [DonationStatusCountDto] }) statusCounts!: DonationStatusCountDto[];
  @ApiProperty({ type: [DonationValueDto] }) confirmedValues!: DonationValueDto[];
}

export class AnalyticsSummaryDto {
  @ApiProperty({ example: 500, description: 'Recorded page-view events, not unique visitors' })
  totalVisitors!: number;
  @ApiProperty({ type: [CountryVisitsDto] }) topCountries!: CountryVisitsDto[];
  @ApiProperty({ type: [PageVisitsDto] }) topPages!: PageVisitsDto[];
  @ApiProperty({ type: FormSummaryDto }) forms!: FormSummaryDto;
  @ApiProperty({ type: ResourceAnalyticsDto }) resources!: ResourceAnalyticsDto;
  @ApiProperty({ type: DonationAnalyticsDto }) donations!: DonationAnalyticsDto;
}

export class AnalyticsTimelinePointDto {
  @ApiProperty({ example: '2026-08-14' }) date!: string;
  @ApiProperty({ example: 20 }) visitors!: number;
  @ApiProperty({ example: 4 }) formSubmissions!: number;
  @ApiProperty({ example: 6 }) resourceDownloads!: number;
  @ApiProperty({ example: 3 }) donationsCreated!: number;
  @ApiProperty({ example: 2 }) donationsConfirmed!: number;
  @ApiProperty({ example: '25.00' }) confirmedUsd!: string;
  @ApiProperty({ example: '1500.00' }) confirmedEtb!: string;
}

export class AnalyticsSummaryApiResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty({ type: AnalyticsSummaryDto }) data!: AnalyticsSummaryDto;
  @ApiProperty({ example: 200 }) statusCode!: number;
  @ApiProperty({ format: 'date-time' }) timestamp!: string;
}

export class AnalyticsTimelineApiResponseDto {
  @ApiProperty({ enum: [true] }) success!: true;
  @ApiProperty({ type: [AnalyticsTimelinePointDto] }) data!: AnalyticsTimelinePointDto[];
  @ApiProperty({ example: 200 }) statusCode!: number;
  @ApiProperty({ format: 'date-time' }) timestamp!: string;
}
