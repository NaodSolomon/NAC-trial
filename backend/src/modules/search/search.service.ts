import { Inject, Injectable } from '@nestjs/common';
import {
  SEARCH_REPOSITORY,
  SearchRepository,
  SearchResultType,
} from './interfaces/search-repository.interface';
import { PublicSearchDto } from './search.dto';

@Injectable()
export class SearchService {
  constructor(
    @Inject(SEARCH_REPOSITORY)
    private readonly repository: SearchRepository,
  ) {}

  async search(query: PublicSearchDto) {
    const term = query.q.trim();
    const records = await this.repository.search({ term, languageCode: query.languageCode });

    return {
      query: term,
      results: records.map((record) => ({
        ...record,
        url: `/${this.pathFor(record.type)}/${record.slug}`,
      })),
    };
  }

  private pathFor(type: SearchResultType): string {
    return type === 'page' ? 'pages' : type === 'event' ? 'events' : 'blog';
  }
}
