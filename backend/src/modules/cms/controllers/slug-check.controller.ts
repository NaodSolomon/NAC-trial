import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { SlugCheckQueryDto } from '../dto/slug-check-query.dto';
import { CmsPagesService } from '../services/cms-pages.service';

@Controller('admin/slugs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'CONTENT_EDITOR')
export class SlugCheckController {
  constructor(private readonly pagesService: CmsPagesService) {}

  @Get('check')
  check(
    @Query() query: SlugCheckQueryDto,
  ): Promise<{ slug: string; languageCode: string; available: boolean }> {
    return this.pagesService.checkSlug(query.slug, query.languageCode);
  }
}
