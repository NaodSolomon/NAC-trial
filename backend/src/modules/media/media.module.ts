import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminMediaController } from './controllers/admin-media.controller';
import { MEDIA_REPOSITORY } from './interfaces/media-repository.interface';
import { OBJECT_STORAGE } from './interfaces/object-storage.interface';
import { DrizzleMediaRepository } from './repositories/drizzle-media.repository';
import { MediaFilePolicyService } from './services/media-file-policy.service';
import { MediaService } from './services/media.service';
import { S3ObjectStorageService } from './storage/s3-object-storage.service';
import { MinioObjectStorageService } from './storage/minio-object-storage.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [AuthModule],
  controllers: [AdminMediaController],
  providers: [
    MediaService,
    MediaFilePolicyService,
    {
      provide: MEDIA_REPOSITORY,
      useClass: DrizzleMediaRepository,
    },
    S3ObjectStorageService,
    MinioObjectStorageService,
    {
      provide: OBJECT_STORAGE,
      inject: [ConfigService, S3ObjectStorageService, MinioObjectStorageService],
      useFactory: (
        config: ConfigService,
        r2: S3ObjectStorageService,
        minio: MinioObjectStorageService,
      ) => (config.get<string>('runtime.storageDriver') === 'minio' ? minio : r2),
    },
  ],
  exports: [MediaService, OBJECT_STORAGE],
})
export class MediaModule {}
