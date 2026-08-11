import { buildSitemapXml } from '@/lib/seo/sitemap';

export const revalidate = 600;

export async function GET() {
  return new Response(await buildSitemapXml(), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600',
    },
  });
}
