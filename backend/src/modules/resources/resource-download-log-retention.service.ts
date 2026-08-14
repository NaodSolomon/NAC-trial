import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RESOURCE_REPOSITORY,
  ResourceRepository,
} from './interfaces/resource-repository.interface';

const DAY_MS = 86_400_000;

@Injectable()
export class ResourceDownloadLogRetentionService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ResourceDownloadLogRetentionService.name);
  private timer?: NodeJS.Timeout;
  private activeCleanup?: Promise<void>;

  constructor(
    private readonly config: ConfigService,
    @Inject(RESOURCE_REPOSITORY) private readonly resources: ResourceRepository,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.getOrThrow<boolean>('app.resourceDownloadLogCleanupEnabled')) return;

    const intervalMs = this.config.getOrThrow<number>('app.resourceDownloadLogCleanupIntervalMs');
    this.startCleanup();
    this.timer = setInterval(() => this.startCleanup(), intervalMs);
    this.timer.unref();
    this.logger.log(`Resource download-log retention enabled with a ${intervalMs} ms interval`);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.activeCleanup;
  }

  async runOnce(now = new Date()): Promise<void> {
    const retentionDays = this.config.getOrThrow<number>('app.resourceDownloadLogRetentionDays');
    await this.resources.purgeDownloadLogsBefore(new Date(now.getTime() - retentionDays * DAY_MS));
  }

  private startCleanup(): void {
    if (this.activeCleanup) return;
    this.activeCleanup = this.runOnce()
      .catch(() => this.logger.error('Resource download-log retention cleanup failed'))
      .finally(() => {
        this.activeCleanup = undefined;
      });
  }
}
