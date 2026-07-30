import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicPageQueryDto } from '../dto/public-page-query.dto';
import { CmsPagesService } from '../services/cms-pages.service';

@ApiTags('Public Content Composition')
@Controller('public/content')
export class PublicCompositionController {
  constructor(private readonly pages: CmsPagesService) {}

  @Get('homepage')
  @ApiOperation({ summary: 'Get homepage sections and SEO metadata from the published home page' })
  async homepage(@Query() query: PublicPageQueryDto) {
    const page = await this.pages.findPublicPage('home', query.languageCode);
    return {
      title: page.title,
      body: page.content,
      sections: page.metadata.sections ?? [],
      seo: {
        title: page.seoTitle ?? page.title,
        description: page.seoDescription,
        imageUrl: page.seoImageUrl,
      },
    };
  }

  @Get('faqs')
  @ApiOperation({ summary: 'Get FAQ items from the published FAQ CMS page' })
  async faqs(@Query() query: PublicPageQueryDto) {
    const page = await this.pages.findPublicPage('faq', query.languageCode);
    return { title: page.title, items: page.metadata.items ?? [], body: page.content };
  }
}
