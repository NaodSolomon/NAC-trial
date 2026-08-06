// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn() })) }));

const composition = {
  title: 'Nehemiah Autism Center',
  body: 'Family-centered support.',
  sections: [
    {
      type: 'hero',
      heading: 'Every child deserves support',
      body: 'A welcoming community.',
      primaryAction: { label: 'Learn more', href: '/about' },
    },
  ],
  seo: { title: 'Nehemiah Autism Center', description: null, imageUrl: null },
};

const meta = { total: 1, page: 1, limit: 3, totalPages: 1 };

describe('loadHomePageData', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('starts all homepage requests and returns typed teaser data', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) =>
      successResponse(responseFor(String(input))),
    );
    const { loadHomePageData } = await import('./home.server');

    const data = await loadHomePageData('en');

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(data.composition.title).toBe('Nehemiah Autism Center');
    expect(data.blogPosts).toHaveLength(1);
    expect(data.events).toHaveLength(1);
    expect(data.galleryItems).toHaveLength(1);
  });

  it('keeps the homepage and healthy teasers when one optional request fails', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.includes('/public/gallery')) {
        return new Response(JSON.stringify({ message: 'Gallery unavailable' }), { status: 503 });
      }
      return successResponse(responseFor(path));
    });
    const { loadHomePageData } = await import('./home.server');

    const data = await loadHomePageData('en');

    expect(data.composition.title).toBe('Nehemiah Autism Center');
    expect(data.blogPosts).toHaveLength(1);
    expect(data.events).toHaveLength(1);
    expect(data.galleryItems).toBeNull();
  });
});

function responseFor(path: string) {
  if (path.includes('/public/content/homepage')) return composition;
  if (path.includes('/public/blog')) {
    return {
      data: [
        {
          id: 'blog-1',
          slug: 'community-story',
          title: 'Community story',
          excerpt: 'News from the center.',
          seoImageUrl: null,
          publishedAt: '2026-08-01T09:00:00.000Z',
        },
      ],
      meta,
    };
  }
  if (path.includes('/public/events')) {
    return {
      data: [
        {
          id: 'event-1',
          slug: 'family-day',
          title: 'Family day',
          description: 'An inclusive event.',
          startDate: '2027-01-15T09:00:00.000Z',
          location: 'Addis Ababa',
        },
      ],
      meta,
    };
  }
  return {
    data: [
      {
        id: 'gallery-1',
        title: 'Community moment',
        altText: 'A moment at the center',
        mediaUrl: 'https://images.example.org/gallery.jpg',
        type: 'IMAGE',
      },
    ],
    meta,
  };
}

function successResponse(data: unknown) {
  return new Response(
    JSON.stringify({ success: true, data, statusCode: 200, timestamp: new Date(0).toISOString() }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}
