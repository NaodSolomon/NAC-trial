import { loadAllPublishedBlogs } from '@/features/blog';
import { loadAllPublishedEvents } from '@/features/events';
import { loadPublishedPage, teamMetadataSchema } from '@/features/cms';
import { localizedUrl } from './site';

const staticRoutes = [
  '/',
  '/about',
  '/faq',
  '/resources',
  '/blog',
  '/events',
  '/gallery',
  '/contact',
  '/volunteer',
  '/donate',
] as const;

export async function buildSitemapXml(): Promise<string> {
  const [englishBlogs, amharicBlogs, englishEvents, amharicEvents, teamReady] = await Promise.all([
    loadAllPublishedBlogs('en').catch(() => []),
    loadAllPublishedBlogs('am').catch(() => []),
    loadAllPublishedEvents('en').catch(() => []),
    loadAllPublishedEvents('am').catch(() => []),
    hasApprovedBilingualTeam(),
  ]);
  const dynamicRoutes = new Set([
    ...englishBlogs.map((post) => `/blog/${post.slug}`),
    ...amharicBlogs.map((post) => `/blog/${post.slug}`),
    ...englishEvents.map((event) => `/events/${event.slug}`),
    ...amharicEvents.map((event) => `/events/${event.slug}`),
  ]);
  if (teamReady) dynamicRoutes.add('/team');
  const routes = [...staticRoutes, ...[...dynamicRoutes].sort()];
  const urls = routes
    .map((route) => {
      const english = escapeXml(localizedUrl(route, 'en'));
      const amharic = escapeXml(localizedUrl(route, 'am'));
      return [
        '  <url>',
        `    <loc>${english}</loc>`,
        `    <xhtml:link rel="alternate" hreflang="en" href="${english}" />`,
        `    <xhtml:link rel="alternate" hreflang="am" href="${amharic}" />`,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${english}" />`,
        `    <changefreq>${route.startsWith('/events/') ? 'weekly' : 'monthly'}</changefreq>`,
        `    <priority>${route === '/' ? '1.0' : route.includes('/', 1) ? '0.6' : '0.7'}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`;
}

async function hasApprovedBilingualTeam() {
  try {
    const pages = await Promise.all([
      loadPublishedPage('team', 'en'),
      loadPublishedPage('team', 'am'),
    ]);
    return pages.every((page) => teamMetadataSchema.safeParse(page.metadata).success);
  } catch {
    return false;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
