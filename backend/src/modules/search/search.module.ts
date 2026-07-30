import { Module } from '@nestjs/common';
import { SEARCH_REPOSITORY } from './interfaces/search-repository.interface';
import { DrizzleSearchRepository } from './repositories/drizzle-search.repository';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  controllers: [SearchController],
  providers: [
    SearchService,
    {
      provide: SEARCH_REPOSITORY,
      useClass: DrizzleSearchRepository,
    },
  ],
})
export class SearchModule {}
