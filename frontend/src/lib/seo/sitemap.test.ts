import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadAllPublishedBlogs = vi.fn();
const loadAllPublishedEvents = vi.fn();
const loadPublishedPage = vi.fn();

vi.mock('@/features/blog', () => ({
  loadAllPublishedBlogs: (...args: unknown[]) => loadAllPublishedBlogs(...args),
}));
vi.mock('@/features/events', () => ({
  loadAllPublishedEvents: (...args: unknown[]) => loadAllPublishedEvents(...args),
}));
vi.mock('@/features/cms', async () => {
  const { z } = await import('zod');
  return {
    loadPublishedPage: (...args: unknown[]) => loadPublishedPage(...args),
    teamMetadataSchema: z.object({
      contentApproved: z.literal(true),
      teamMembers: z.array(z.object({ name: z.string() })).min(1),
    }),
  };
});

const { buildSitemapXml } = await import('./sitemap');

const approvedTeam = {
  metadata: { contentApproved: true, teamMembers: [{ name: 'A Person' }] },
};

beforeEach(() => {
  vi.clearAllMocks();
  loadAllPublishedBlogs.mockResolvedValue([]);
  loadAllPublishedEvents.mockResolvedValue([]);
  loadPublishedPage.mockRejectedValue(new Error('not published'));
});

describe('buildSitemapXml', () => {
  it('lists the public routes with both language alternates', async () => {
    const xml = await buildSitemapXml();
    for (const route of ['/about', '/faq', '/resources', '/gallery', '/contact', '/donate']) {
      expect(xml).toContain(`${route}?lang=en`);
      expect(xml).toContain(`${route}?lang=am`);
    }
    expect(xml).toContain('hreflang="x-default"');
  });

  it('never exposes administrator or private routes', async () => {
    const xml = await buildSitemapXml();
    for (const route of ['/admin', '/donate/simulated', '/coming-soon', '/search']) {
      expect(xml).not.toContain(route);
    }
  });

  it('includes published entries once even when both languages share a slug', async () => {
    loadAllPublishedBlogs.mockResolvedValue([{ slug: 'shared-story' }]);
    const xml = await buildSitemapXml();
    // Each entry repeats its English URL inside its own block, so count blocks.
    const blocks = xml.split('<url>').filter((block) => block.includes('shared-story'));
    expect(blocks).toHaveLength(1);
  });

  it('escapes characters that would otherwise break the document', async () => {
    loadAllPublishedBlogs.mockResolvedValue([{ slug: 'a&b<c>' }]);
    const xml = await buildSitemapXml();
    // Angle brackets are percent-encoded by URL construction; an ampersand survives
    // that and must be escaped, or the document stops being well formed.
    expect(xml).toContain('a&amp;b%3Cc%3E');
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
  });

  it('marks events as changing more often than static pages', async () => {
    loadAllPublishedEvents.mockResolvedValue([{ slug: 'family-day' }]);
    const xml = await buildSitemapXml();
    const blockFor = (needle: string) =>
      xml.split('<url>').find((block) => block.includes(needle)) ?? '';

    expect(blockFor('/events/family-day')).toContain('<changefreq>weekly</changefreq>');
    expect(blockFor('/about')).toContain('<changefreq>monthly</changefreq>');
    // The home page outranks the rest, and nested routes rank below top-level ones.
    expect(blockFor('<loc>http://localhost:3000/?lang=en')).toContain('<priority>1.0</priority>');
    expect(blockFor('/about')).toContain('<priority>0.7</priority>');
    expect(blockFor('/events/family-day')).toContain('<priority>0.6</priority>');
  });

  it('publishes the team route only when both languages are approved', async () => {
    expect(await buildSitemapXml()).not.toContain('/team');

    loadPublishedPage.mockResolvedValue(approvedTeam);
    expect(await buildSitemapXml()).toContain('/team');
  });

  it('withholds the team route when one language is unapproved', async () => {
    loadPublishedPage.mockImplementation(async (_slug: string, language: string) =>
      language === 'en' ? approvedTeam : { metadata: { contentApproved: false, teamMembers: [] } },
    );
    expect(await buildSitemapXml()).not.toContain('/team');
  });

  it('still produces a valid document when a content source fails', async () => {
    loadAllPublishedBlogs.mockRejectedValue(new Error('upstream down'));
    const xml = await buildSitemapXml();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('</urlset>');
    expect(xml).toContain('/about');
  });
});
