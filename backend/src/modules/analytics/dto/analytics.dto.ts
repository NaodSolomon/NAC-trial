import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

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
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  range: 'day' | 'week' | 'month' = 'month';
}
