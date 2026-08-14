import { ConfigService } from '@nestjs/config';
import { ObjectStorage } from '../interfaces/object-storage.interface';
import { StorageDeletionOutboxRepository } from '../interfaces/storage-deletion-outbox-repository.interface';
import { StorageDeletionOutboxService } from './storage-deletion-outbox.service';

describe('StorageDeletionOutboxService', () => {
  let outbox: jest.Mocked<StorageDeletionOutboxRepository>;
  let storage: jest.Mocked<ObjectStorage>;
  let service: StorageDeletionOutboxService;

  beforeEach(() => {
    outbox = {
      claimBatch: jest.fn(),
      markDeleted: jest.fn().mockResolvedValue(true),
      markFailed: jest.fn().mockResolvedValue(true),
    };
    storage = {
      put: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      publicUrl: jest.fn(),
    };
    service = new StorageDeletionOutboxService(config(), outbox, storage);
  });

  it('deletes a claimed object and marks the durable job complete', async () => {
    outbox.claimBatch.mockResolvedValue([claim(1)]);

    await expect(service.runOnce(new Date('2026-08-14T12:00:00Z'))).resolves.toEqual({
      claimed: 1,
      deleted: 1,
      retried: 0,
      failed: 0,
    });
    expect(storage.delete).toHaveBeenCalledWith('gallery/2026/08/asset.webp');
    expect(outbox.markDeleted).toHaveBeenCalledTimes(1);
  });

  it('backs off a transient object-storage failure', async () => {
    const now = new Date('2026-08-14T12:00:00Z');
    outbox.claimBatch.mockResolvedValue([claim(1)]);
    storage.delete.mockRejectedValue(new Error('MinIO unavailable'));

    await expect(service.runOnce(now)).resolves.toMatchObject({ retried: 1, failed: 0 });
    expect(outbox.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        terminal: false,
        errorCode: 'OBJECT_DELETION_FAILED',
        nextAttemptAt: new Date('2026-08-14T12:00:02Z'),
      }),
    );
  });

  it('marks an exhausted object deletion terminally failed', async () => {
    outbox.claimBatch.mockResolvedValue([claim(3)]);
    storage.delete.mockRejectedValue(new Error('persistent failure'));

    await expect(service.runOnce()).resolves.toMatchObject({ retried: 0, failed: 1 });
    expect(outbox.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({ terminal: true, errorCode: 'OBJECT_DELETION_FAILED' }),
    );
  });
});

function config(): ConfigService {
  const values: Record<string, boolean | number> = {
    'storage.deletionWorkerEnabled': false,
    'storage.deletionWorkerIntervalMs': 5_000,
    'storage.deletionWorkerBatchSize': 10,
    'storage.deletionWorkerMaxAttempts': 3,
    'storage.deletionWorkerBackoffMs': 2_000,
    'storage.deletionWorkerLockTimeoutMs': 30_000,
  };
  return { getOrThrow: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

function claim(attempts: number) {
  return {
    id: '24c1803e-25eb-48d7-9848-3b645698cd25',
    objectKey: 'gallery/2026/08/asset.webp',
    attempts,
    lockToken: 'df63fd32-8bf5-4406-8e4a-73ade58d4507',
  };
}
