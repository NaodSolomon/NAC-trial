import { Controller, Post, UseGuards } from '@nestjs/common';
import { InternalApiKeyGuard } from '../../../common/guards/internal-api-key.guard';
import { ScheduledPublishingService } from '../services/scheduled-publishing.service';

@Controller('internal/jobs')
@UseGuards(InternalApiKeyGuard)
export class InternalPublishingJobsController {
  constructor(private readonly publishing: ScheduledPublishingService) {}

  @Post('publish-scheduled')
  async publishScheduled(): Promise<{
    processed: number;
    message: string;
  }> {
    const result = await this.publishing.runOnce();

    return {
      processed: result.processed,
      message:
        result.status === 'completed'
          ? 'Scheduled content publishing completed'
          : 'Scheduled content publishing is already running',
    };
  }
}
