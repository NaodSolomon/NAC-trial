import { Controller, Get, Param, Query } from '@nestjs/common';
import { CmsPage } from '../../../database/schema';
import { PublicPageQueryDto } from '../dto/public-page-query.dto';
import { CmsPagesService } from '../services/cms-pages.service';

@Controller('public/pages')
export class PublicCmsPagesController {
  constructor(private readonly pagesService: CmsPagesService) {}

  @Get(':slug')
  findPublished(@Param('slug') slug: string, @Query() query: PublicPageQueryDto): Promise<CmsPage> {
    return this.pagesService.findPublicPage(slug, query.languageCode);
  }
}
