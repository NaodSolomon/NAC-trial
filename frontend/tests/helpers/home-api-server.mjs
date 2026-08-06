import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const port = 4010;

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  if (url.pathname === '/health') return json(response, { ok: true });
  if (url.pathname.startsWith('/assets/')) return asset(response, url.pathname);

  const language = url.searchParams.get('languageCode') === 'am' ? 'am' : 'en';
  if (url.pathname === '/api/v1/public/content/homepage') {
    return envelope(response, homepage(language));
  }
  if (url.pathname === '/api/v1/public/blog') return envelope(response, paginated(blogs(language)));
  if (url.pathname === '/api/v1/public/events') {
    return envelope(response, paginated(events(language)));
  }
  if (url.pathname === '/api/v1/public/gallery') {
    return envelope(response, paginated(gallery(language)));
  }
  if (url.pathname === '/api/v1/settings') return envelope(response, settings);
  if (url.pathname === '/api/v1/navigation') {
    return envelope(response, navigation(language));
  }
  return json(response, { success: false, statusCode: 404, message: 'Not found' }, 404);
}).listen(port, '127.0.0.1');

const settings = {
  siteName: 'Nehemiah Autism Center',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'am'],
  contactEmail: 'support@nehemiah.org',
  phone: '+251 11 000 0000',
  address: 'Addis Ababa, Ethiopia',
};

function homepage(language) {
  const amharic = language === 'am';
  return {
    title: amharic ? 'ነህምያ ኦቲዝም ማዕከል' : 'Nehemiah Autism Center',
    body: amharic ? 'ለቤተሰቦች ድጋፍ።' : 'Family-centered autism support in Ethiopia.',
    sections: [
      {
        type: 'hero',
        heading: amharic
          ? 'እያንዳንዱ ልጅ መረዳትና ድጋፍ ይገባዋል'
          : 'Every child deserves understanding, support, and opportunity',
        body: amharic
          ? 'ቤተሰብን ማዕከል ያደረጉ የኦቲዝም አገልግሎቶች።'
          : 'Discover family-centered autism services and a welcoming community in Ethiopia.',
        primaryAction: {
          label: amharic ? 'ተጨማሪ ይወቁ' : 'Explore our services',
          href: '/about',
        },
        secondaryAction: { label: amharic ? 'ያግኙን' : 'Contact us', href: '/contact' },
      },
      {
        type: 'services',
        heading: amharic ? 'ቤተሰቦችን የምንደግፍባቸው መንገዶች' : 'How we support families',
        items: [
          {
            title: amharic ? 'የቤተሰብ ምክር' : 'Family guidance',
            body: amharic
              ? 'ተግባራዊ መረጃና ድጋፍ።'
              : 'Practical information and support for parents and caregivers.',
          },
          {
            title: amharic ? 'የትምህርት ድጋፍ' : 'Learning support',
            body: amharic
              ? 'የልጆችን ጥንካሬ የሚያከብር ትምህርት።'
              : 'Individual support that respects every child.',
          },
          {
            title: amharic ? 'የማህበረሰብ ግንዛቤ' : 'Community awareness',
            body: amharic
              ? 'አካታችነትን የሚያዳብር ትምህርት።'
              : 'Education that encourages inclusion and acceptance.',
          },
        ],
      },
      {
        type: 'callToAction',
        heading: amharic ? 'ከቡድናችን ጋር ውይይት ይጀምሩ' : 'Start a conversation with our team',
        body: amharic
          ? 'ልንሰማዎትና ልንረዳዎት ዝግጁ ነን።'
          : 'We are here to listen and help you find the right next step.',
        action: { label: amharic ? 'ያግኙን' : 'Get in touch', href: '/contact' },
      },
    ],
    seo: {
      title: amharic ? 'ነህምያ ኦቲዝም ማዕከል' : 'Nehemiah Autism Center | Autism Support in Ethiopia',
      description: amharic ? 'በኢትዮጵያ የኦቲዝም ድጋፍ።' : 'Family-centered autism support in Ethiopia.',
      imageUrl: null,
    },
  };
}

function blogs(language) {
  return [1, 2, 3].map((number) => ({
    id: `blog-${number}`,
    slug: `story-${number}`,
    title: language === 'am' ? `የማህበረሰብ ታሪክ ${number}` : `Community story ${number}`,
    excerpt:
      language === 'am' ? 'የማዕከሉ የቅርብ ጊዜ ዜና።' : 'Recent news from the center and its community.',
    seoImageUrl: null,
    publishedAt: '2026-08-01T09:00:00.000Z',
  }));
}

function events(language) {
  return [1, 2, 3].map((number) => ({
    id: `event-${number}`,
    slug: `event-${number}`,
    title: language === 'am' ? `የማህበረሰብ ዝግጅት ${number}` : `Community event ${number}`,
    description:
      language === 'am'
        ? 'ቤተሰቦችን የሚያገናኝ ዝግጅት።'
        : 'An inclusive activity for families and supporters.',
    startDate: `2027-0${number}-15T09:00:00.000Z`,
    location: language === 'am' ? 'አዲስ አበባ' : 'Addis Ababa',
  }));
}

function gallery(language) {
  return [1, 2, 3, 4].map((number) => ({
    id: `gallery-${number}`,
    title: language === 'am' ? `የማህበረሰብ ቅጽበት ${number}` : `Community moment ${number}`,
    altText: language === 'am' ? 'በማዕከሉ የተወሰደ ምስል' : 'A moment at Nehemiah Autism Center',
    mediaUrl: `http://127.0.0.1:${port}/assets/gallery_${number}.jpg`,
    type: 'IMAGE',
  }));
}

function navigation(language) {
  const labels =
    language === 'am'
      ? ['መነሻ', 'ስለ እኛ', 'ዝግጅቶች', 'ብሎግ', 'ያግኙን']
      : ['Home', 'About us', 'Events', 'Blog', 'Contact'];
  return ['/', '/about', '/events', '/blog', '/contact'].map((url, index) => ({
    id: `nav-${language}-${index}`,
    label: labels[index],
    url,
  }));
}

async function asset(response, pathname) {
  const filename = pathname
    .split('/')
    .at(-1)
    ?.replace(/[^a-zA-Z0-9_.-]/g, '');
  if (!filename) return json(response, { message: 'Not found' }, 404);
  try {
    const image = await readFile(resolve('public/images', filename));
    response.writeHead(200, {
      'content-type': 'image/jpeg',
      'cache-control': 'public, max-age=60',
    });
    return response.end(image);
  } catch {
    return json(response, { message: 'Not found' }, 404);
  }
}

function paginated(data) {
  return {
    data,
    meta: { total: data.length, page: 1, limit: data.length || 1, totalPages: data.length ? 1 : 0 },
  };
}

function envelope(response, data) {
  return json(response, {
    success: true,
    data,
    statusCode: 200,
    timestamp: new Date(0).toISOString(),
  });
}

function json(response, body, status = 200) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': 'http://localhost:3000',
    'access-control-allow-credentials': 'true',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(body));
}
