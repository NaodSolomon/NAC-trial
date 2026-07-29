import { Controller, Get, Query } from '@nestjs/common';
import { GalleryQueryDto } from '../dto/gallery.dto';
import { GalleryService } from '../services/gallery.service';

@Controller('public/gallery')
export class PublicGalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  list(@Query() query: GalleryQueryDto) {
    return this.galleryService.list(query);
  }
}
