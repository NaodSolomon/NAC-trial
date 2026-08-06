import { ConfigService } from '@nestjs/config';
import { ScheduledPublishingLock } from '../interfaces/scheduled-publishing-lock.interface';
import { CmsPagesService } from './cms-pages.service';
import { ScheduledPublishingService } from './scheduled-publishing.service';

describe('ScheduledPublishingService', () => {
  const enabledConfig = {
    getOrThrow: jest.fn((key: string) => (key === 'app.scheduledPublishingEnabled' ? true : 1_000)),
  } as unknown as ConfigService;
  let lock: jest.Mocked<ScheduledPublishingLock>;
  let pages: { publishScheduled: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    lock = { runExclusive: jest.fn() };
    pages = { publishScheduled: jest.fn().mockResolvedValue(1) };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('publishes through the cross-process lock', async () => {
    lock.runExclusive.mockImplementation(async (operation) => ({
      acquired: true,
      value: await operation(),
    }));
    const service = new ScheduledPublishingService(
      enabledConfig,
      lock,
      pages as unknown as CmsPagesService,
    );

    await expect(service.runOnce()).resolves.toEqual({ status: 'completed', processed: 1 });
    expect(pages.publishScheduled).toHaveBeenCalledTimes(1);
  });

  it('reports a busy run without publishing', async () => {
    lock.runExclusive.mockResolvedValue({ acquired: false });
    const service = new ScheduledPublishingService(
      enabledConfig,
      lock,
      pages as unknown as CmsPagesService,
    );

    await expect(service.runOnce()).resolves.toEqual({ status: 'busy', processed: 0 });
    expect(pages.publishScheduled).not.toHaveBeenCalled();
  });

  it('runs at startup and on the configured interval', async () => {
    lock.runExclusive.mockResolvedValue({ acquired: true, value: 0 });
    const service = new ScheduledPublishingService(
      enabledConfig,
      lock,
      pages as unknown as CmsPagesService,
    );

    service.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(1_000);
    await service.onApplicationShutdown();

    expect(lock.runExclusive).toHaveBeenCalledTimes(2);
  });

  it('does not start a timer when explicitly disabled', async () => {
    const disabledConfig = {
      getOrThrow: jest.fn().mockReturnValue(false),
    } as unknown as ConfigService;
    const service = new ScheduledPublishingService(
      disabledConfig,
      lock,
      pages as unknown as CmsPagesService,
    );

    service.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(5_000);

    expect(lock.runExclusive).not.toHaveBeenCalled();
  });
});
