import { Controller, Post, UseGuards } from '@nestjs/common';
import { InternalApiKeyGuard } from '../../../common/guards/internal-api-key.guard';
import { CmsPagesService } from '../services/cms-pages.service';

@Controller('internal/jobs')
@UseGuards(InternalApiKeyGuard)
export class InternalPublishingJobsController {
  constructor(private readonly pagesService: CmsPagesService) {}

  @Post('publish-scheduled')
  async publishScheduled(): Promise<{
    processed: number;
    message: string;
  }> {
    const processed = await this.pagesService.publishScheduled();

    return {
      processed,
      message: 'Scheduled content publishing completed',
    };
  }
}
