import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminMediaController } from './controllers/admin-media.controller';
import { MEDIA_REPOSITORY } from './interfaces/media-repository.interface';
import { OBJECT_STORAGE } from './interfaces/object-storage.interface';
import { DrizzleMediaRepository } from './repositories/drizzle-media.repository';
import { MediaFilePolicyService } from './services/media-file-policy.service';
import { MediaService } from './services/media.service';
import { S3ObjectStorageService } from './storage/s3-object-storage.service';

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
    {
      provide: OBJECT_STORAGE,
      useClass: S3ObjectStorageService,
    },
  ],
})
export class MediaModule {}
