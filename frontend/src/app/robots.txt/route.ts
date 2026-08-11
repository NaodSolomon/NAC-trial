import { getSiteUrl } from '@/lib/seo/site';

export function GET() {
  const siteUrl = getSiteUrl();
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /api/',
    'Disallow: /dashboard/',
    'Disallow: /login',
    `Sitemap: ${new URL('/sitemap.xml', siteUrl).toString()}`,
    `Host: ${siteUrl.origin}`,
    '',
  ].join('\n');
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
