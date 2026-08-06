import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SCHEDULED_PUBLISHING_LOCK,
  ScheduledPublishingLock,
} from '../interfaces/scheduled-publishing-lock.interface';
import { CmsPagesService } from './cms-pages.service';

export type ScheduledPublishingRunResult =
  | { status: 'completed'; processed: number }
  | { status: 'busy'; processed: 0 };

@Injectable()
export class ScheduledPublishingService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ScheduledPublishingService.name);
  private timer?: NodeJS.Timeout;
  private activeTick?: Promise<void>;

  constructor(
    private readonly config: ConfigService,
    @Inject(SCHEDULED_PUBLISHING_LOCK)
    private readonly lock: ScheduledPublishingLock,
    private readonly pagesService: CmsPagesService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.getOrThrow<boolean>('app.scheduledPublishingEnabled')) return;

    const intervalMs = this.config.getOrThrow<number>('app.scheduledPublishingIntervalMs');
    this.startTick();
    this.timer = setInterval(() => this.startTick(), intervalMs);
    this.timer.unref();
    this.logger.log(`Scheduled publishing enabled with a ${intervalMs} ms interval`);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.activeTick;
  }

  async runOnce(): Promise<ScheduledPublishingRunResult> {
    const result = await this.lock.runExclusive(() => this.pagesService.publishScheduled());
    if (!result.acquired) return { status: 'busy', processed: 0 };

    return { status: 'completed', processed: result.value };
  }

  private startTick(): void {
    if (this.activeTick) return;

    this.activeTick = this.runOnce()
      .then((result) => {
        if (result.status === 'completed' && result.processed > 0) {
          this.logger.log(`Automatically published ${result.processed} scheduled CMS page(s)`);
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown publishing error';
        this.logger.error(`Scheduled publishing attempt failed: ${message}`);
      })
      .finally(() => {
        this.activeTick = undefined;
      });
  }
}
