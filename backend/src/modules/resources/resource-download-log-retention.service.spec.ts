import { ConfigService } from '@nestjs/config';
import { ResourceRepository } from './interfaces/resource-repository.interface';
import { ResourceDownloadLogRetentionService } from './resource-download-log-retention.service';

describe('ResourceDownloadLogRetentionService', () => {
  it('purges records older than the configured maximum retention period', async () => {
    const repository = {
      purgeDownloadLogsBefore: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ResourceRepository>;
    const config = {
      getOrThrow: jest.fn((key: string) =>
        key === 'app.resourceDownloadLogRetentionDays' ? 365 : false,
      ),
    } as unknown as ConfigService;
    const service = new ResourceDownloadLogRetentionService(config, repository);

    await service.runOnce(new Date('2026-08-14T12:00:00.000Z'));

    expect(repository.purgeDownloadLogsBefore).toHaveBeenCalledWith(
      new Date('2025-08-14T12:00:00.000Z'),
    );
  });
});
