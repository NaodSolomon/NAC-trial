import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicSearchDto } from './search.dto';
import { SearchService } from './search.service';

@ApiTags('Public Search')
@Controller('public/search')
export class SearchController {
  constructor(private readonly search: SearchService) {}
  @Get()
  @ApiOperation({ summary: 'Search published CMS pages, events, and blog posts using PostgreSQL' })
  find(@Query() query: PublicSearchDto) { return this.search.search(query); }
}
