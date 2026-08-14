import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { storageDeletionOutbox } from '../../src/database/schema';
import { ObjectStorage } from '../../src/modules/media/interfaces/object-storage.interface';
import { DrizzleMediaRepository } from '../../src/modules/media/repositories/drizzle-media.repository';
import { PostgresStorageDeletionOutboxRepository } from '../../src/modules/media/repositories/postgres-storage-deletion-outbox.repository';
import { StorageDeletionOutboxService } from '../../src/modules/media/services/storage-deletion-outbox.service';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import { connectTestPostgres, PostgresTestContext } from '../helpers/postgres-test.helper';
import { ACTOR_ID, insertTestAdmin } from '../helpers/repository-fixtures.helper';

const describeWithPostgres = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeWithPostgres('Storage deletion outbox (PostgreSQL)', () => {
  let context: PostgresTestContext;
  let media: DrizzleMediaRepository;
  let outbox: PostgresStorageDeletionOutboxRepository;
  let storage: jest.Mocked<ObjectStorage>;
  let service: StorageDeletionOutboxService;

  beforeAll(async () => {
    context = await connectTestPostgres();
    media = new DrizzleMediaRepository(context.db);
    outbox = new PostgresStorageDeletionOutboxRepository(context.pool);
  });

  beforeEach(async () => {
    await cleanTestDatabase(context);
    await insertTestAdmin(context);
    storage = {
      put: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      publicUrl: jest.fn(),
    };
    service = new StorageDeletionOutboxService(workerConfig(), outbox, storage);
  });

  afterAll(async () => context?.pool.end());

  it('claims once, deletes idempotently, and never reprocesses a completed object', async () => {
    const asset = await media.create(
      {
        objectKey: 'integration/outbox/delete.webp',
        publicUrl: 'http://minio.test/integration/outbox/delete.webp',
        originalName: 'delete.webp',
        mimeType: 'image/webp',
        sizeBytes: 128,
        type: 'IMAGE',
        uploadedBy: ACTOR_ID,
      },
      null,
      ACTOR_ID,
    );
    await media.deleteAndEnqueueStorageCleanup(asset.id, ACTOR_ID);

    const now = new Date();
    const [firstClaims, competingClaims] = await Promise.all([
      outbox.claimBatch(claimCriteria(now, '7ea1e814-1970-4e18-95fb-dcf9095c765b')),
      outbox.claimBatch(claimCriteria(now, 'ada4cf75-e2b0-476e-85a4-44b631f8c002')),
    ]);
    expect(firstClaims.length + competingClaims.length).toBe(1);

    const [claim] = [...firstClaims, ...competingClaims];
    await outbox.markFailed({
      id: claim.id,
      lockToken: claim.lockToken,
      terminal: false,
      nextAttemptAt: now,
      errorCode: 'TEST_RELEASE',
      processedAt: now,
    });

    await expect(service.runOnce(new Date(now.getTime() + 1))).resolves.toMatchObject({
      deleted: 1,
    });
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenCalledWith(asset.objectKey);
    await expect(service.runOnce(new Date(now.getTime() + 2))).resolves.toMatchObject({
      claimed: 0,
      deleted: 0,
    });

    const [job] = await context.db
      .select()
      .from(storageDeletionOutbox)
      .where(eq(storageDeletionOutbox.objectKey, asset.objectKey));
    expect(job).toMatchObject({ status: 'SENT', attempts: 2, lastError: null });
    expect(job.processedAt).toBeInstanceOf(Date);
  });
});

function workerConfig(): ConfigService {
  const values: Record<string, boolean | number> = {
    'storage.deletionWorkerEnabled': false,
    'storage.deletionWorkerIntervalMs': 5_000,
    'storage.deletionWorkerBatchSize': 10,
    'storage.deletionWorkerMaxAttempts': 3,
    'storage.deletionWorkerBackoffMs': 1_000,
    'storage.deletionWorkerLockTimeoutMs': 30_000,
  };
  return { getOrThrow: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

function claimCriteria(now: Date, lockToken: string) {
  return {
    batchSize: 10,
    maxAttempts: 3,
    now,
    staleBefore: new Date(now.getTime() - 30_000),
    lockToken,
  };
}
