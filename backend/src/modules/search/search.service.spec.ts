import { SearchService } from './search.service';

describe('SearchService', () => {
  it('combines CMS, event, and blog rows into frontend URLs', async () => {
    const repository = {
      search: jest.fn().mockResolvedValue([
        {
          type: 'page',
        slug: 'family-support',
        title: 'Family support',
        summary: 'Page summary',
        languageCode: 'en',
        date: new Date('2026-01-01'),
        },
        {
          type: 'event',
          slug: 'family-day',
          title: 'Family day',
          summary: 'Event summary',
          languageCode: 'en',
          date: new Date('2026-02-01'),
        },
        {
          type: 'blog',
          slug: 'support-guide',
          title: 'Support guide',
          summary: 'Blog summary',
          languageCode: 'en',
          date: new Date('2026-03-01'),
        },
      ]),
    };
    const service = new SearchService(repository);

    await expect(service.search({ q: '  support  ', languageCode: 'en' })).resolves.toMatchObject({
      query: 'support',
      results: [
        { type: 'page', url: '/pages/family-support' },
        { type: 'event', url: '/events/family-day' },
        { type: 'blog', url: '/blog/support-guide' },
      ],
    });
    expect(repository.search).toHaveBeenCalledWith({ term: 'support', languageCode: 'en' });
  });

  it('returns an empty result set when no published source matches', async () => {
    const repository = { search: jest.fn().mockResolvedValue([]) };

    await expect(new SearchService(repository).search({ q: 'unknown' })).resolves.toEqual({
      query: 'unknown',
      results: [],
    });
  });
});
