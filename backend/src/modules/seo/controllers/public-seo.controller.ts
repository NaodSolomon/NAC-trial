import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SeoLanguageQueryDto } from '../dto/seo-language-query.dto';
import { SeoApiResponseDto, SeoResponse } from '../interfaces/seo-response.interface';
import { SeoService } from '../services/seo.service';

@ApiTags('SEO')
@Controller('public/seo')
export class PublicSeoController {
  constructor(private readonly seo: SeoService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get public SEO metadata for a published CMS page' })
  @ApiOkResponse({ type: SeoApiResponseDto })
  @ApiNotFoundResponse({ description: 'Published SEO metadata was not found' })
  find(@Param('slug') slug: string, @Query() query: SeoLanguageQueryDto): Promise<SeoResponse> {
    return this.seo.findPublic(slug, query.languageCode);
  }
}
