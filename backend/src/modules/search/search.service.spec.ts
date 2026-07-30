import { SearchService } from './search.service';

function queryReturning(rows: Array<Record<string, unknown>>) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
}

describe('SearchService', () => {
  it('combines CMS, event, and blog rows into frontend URLs', async () => {
    const pageQuery = queryReturning([
      {
        slug: 'family-support',
        title: 'Family support',
        summary: 'Page summary',
        languageCode: 'en',
        date: new Date('2026-01-01'),
      },
    ]);
    const eventQuery = queryReturning([
      {
        slug: 'family-day',
        title: 'Family day',
        summary: 'Event summary',
        languageCode: 'en',
        date: new Date('2026-02-01'),
      },
    ]);
    const blogQuery = queryReturning([
      {
        slug: 'support-guide',
        title: 'Support guide',
        summary: 'Blog summary',
        languageCode: 'en',
        date: new Date('2026-03-01'),
      },
    ]);
    const database = {
      select: jest
        .fn()
        .mockReturnValueOnce(pageQuery)
        .mockReturnValueOnce(eventQuery)
        .mockReturnValueOnce(blogQuery),
    };
    const service = new SearchService(database as never);

    await expect(service.search({ q: '  support  ', languageCode: 'en' })).resolves.toMatchObject({
      query: 'support',
      results: [
        { type: 'page', url: '/pages/family-support' },
        { type: 'event', url: '/events/family-day' },
        { type: 'blog', url: '/blog/support-guide' },
      ],
    });
    expect(database.select).toHaveBeenCalledTimes(3);
    expect(pageQuery.limit).toHaveBeenCalledWith(10);
    expect(eventQuery.limit).toHaveBeenCalledWith(10);
    expect(blogQuery.limit).toHaveBeenCalledWith(10);
  });

  it('returns an empty result set when no published source matches', async () => {
    const database = {
      select: jest
        .fn()
        .mockReturnValueOnce(queryReturning([]))
        .mockReturnValueOnce(queryReturning([]))
        .mockReturnValueOnce(queryReturning([])),
    };

    await expect(new SearchService(database as never).search({ q: 'unknown' })).resolves.toEqual({
      query: 'unknown',
      results: [],
    });
  });
});
