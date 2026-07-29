import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { AdminGalleryController } from './controllers/admin-gallery.controller';
import { PublicGalleryController } from './controllers/public-gallery.controller';
import { GALLERY_REPOSITORY } from './interfaces/gallery-repository.interface';
import { DrizzleGalleryRepository } from './repositories/drizzle-gallery.repository';
import { GalleryService } from './services/gallery.service';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [PublicGalleryController, AdminGalleryController],
  providers: [GalleryService, { provide: GALLERY_REPOSITORY, useClass: DrizzleGalleryRepository }],
})
export class GalleryModule {}
