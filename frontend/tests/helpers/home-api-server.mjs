import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const port = 4010;
const downloadCounts = new Map();

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  if (url.pathname === '/health') return json(response, { ok: true });
  if (url.pathname.startsWith('/assets/')) return asset(response, url.pathname);
  if (url.pathname.startsWith('/downloads/')) return downloadAsset(response);

  const language = url.searchParams.get('languageCode') === 'am' ? 'am' : 'en';
  if (url.pathname === '/api/v1/public/content/homepage') {
    return envelope(response, homepage(language));
  }
  if (url.pathname === '/api/v1/public/blog') {
    return envelope(response, paginated(blogs(language), url));
  }
  const blogDetail = url.pathname.match(/^\/api\/v1\/public\/blog\/([^/]+)$/);
  if (blogDetail) {
    const post = blogs(language).find((item) => item.slug === decodeURIComponent(blogDetail[1]));
    return post
      ? envelope(response, post)
      : json(response, { success: false, statusCode: 404, message: 'Not found' }, 404);
  }
  if (url.pathname === '/api/v1/public/search') {
    return envelope(response, searchResults(url.searchParams.get('q') ?? '', language));
  }
  if (url.pathname === '/api/v1/public/events') {
    return envelope(response, paginated(events(language)));
  }
  if (url.pathname === '/api/v1/public/gallery') {
    return envelope(response, paginated(gallery(language)));
  }
  if (url.pathname === '/api/v1/public/pages/about') {
    return envelope(response, about(language));
  }
  if (url.pathname === '/api/v1/public/content/faqs') {
    return envelope(response, faqs(language));
  }
  if (url.pathname === '/api/v1/public/resources') {
    return envelope(response, paginated(resources(language)));
  }
  const resourceDownload = url.pathname.match(
    /^\/api\/v1\/public\/resources\/([0-9a-f-]+)\/download$/,
  );
  if (resourceDownload) {
    const resource = resources(language).find((item) => item.id === resourceDownload[1]);
    if (!resource) return json(response, { message: 'Not found' }, 404);
    const downloadCount = (downloadCounts.get(resource.id) ?? resource.downloadCount) + 1;
    downloadCounts.set(resource.id, downloadCount);
    return envelope(response, {
      id: resource.id,
      fileUrl: resource.fileUrl,
      fileName: resource.fileName,
      mimeType: resource.mimeType,
      downloadCount,
    });
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
  const slugs = [
    'how-your-donations-change-lives',
    'family-support-at-home',
    'inclusive-learning-practices',
    'community-awareness-day',
    'caregiver-conversation',
    'celebrating-every-strength',
    'a-welcoming-community',
    'practical-family-guidance',
  ];
  return slugs.map((slug, index) => ({
    id: `00000000-0000-4000-8000-00000000030${index + 1}`,
    slug,
    languageCode: language,
    title:
      language === 'am'
        ? `Community story ${index + 1}`
        : index === 0
          ? 'How your support changes lives'
          : `Community story ${index + 1}`,
    excerpt: 'Practical guidance and recent news from the center and its community.',
    content:
      'Families are at the center of our work.\n\nThis published story shares practical guidance and the impact of an inclusive community.',
    status: 'PUBLISHED',
    seoTitle: index === 0 ? 'How support changes lives | Nehemiah Autism Center' : null,
    seoDescription: index === 0 ? 'See how community support helps families thrive.' : null,
    seoImageUrl: null,
    publishedAt: `2026-08-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`,
    updatedAt: `2026-08-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`,
  }));
}

function searchResults(query, language) {
  return {
    query,
    results: [
      {
        type: 'page',
        slug: 'about',
        title: 'About our family support',
        summary: '<p>Learn about our work.</p><script>draft-secret</script>',
        languageCode: language,
        date: null,
        url: '/pages/about',
      },
      {
        type: 'event',
        slug: 'event-1',
        title: 'Family support event',
        summary: 'An inclusive activity for families and supporters.',
        languageCode: language,
        date: '2027-01-15T09:00:00.000Z',
        url: '/events/event-1',
      },
      {
        type: 'blog',
        slug: 'how-your-donations-change-lives',
        title: 'How your support changes lives',
        summary: 'A published community story.',
        languageCode: language,
        date: '2026-08-01T09:00:00.000Z',
        url: '/blog/how-your-donations-change-lives',
      },
    ],
  };
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

function about(language) {
  const amharic = language === 'am';
  return {
    id: amharic ? '00000000-0000-4000-8000-000000000102' : '00000000-0000-4000-8000-000000000101',
    slug: 'about',
    languageCode: language,
    title: amharic ? 'ስለ ነህምያ ኦቲዝም ማዕከል' : 'About Nehemiah Autism Center',
    content: amharic
      ? 'ማዕከላችን ኦቲዝም ያለባቸውን ህጻናትና ቤተሰቦቻቸውን ይደግፋል።'
      : '<p>Nehemiah Autism Center provides family-centered autism support in Ethiopia.</p><script>draft-secret</script>',
    status: 'PUBLISHED',
    seoTitle: amharic ? 'ስለ ነህምያ ኦቲዝም ማዕከል' : 'About Nehemiah Autism Center',
    seoDescription: amharic ? 'ስለ ማዕከላችን ይወቁ።' : 'Learn about our family-centered work.',
    seoImageUrl: null,
  };
}

function faqs(language) {
  const amharic = language === 'am';
  return {
    title: amharic ? 'ተደጋጋሚ ጥያቄዎች' : 'Frequently Asked Questions',
    body: amharic ? 'ስለ ማዕከላችን መልሶችን ያግኙ።' : 'Answers about the center and its services.',
    items: [
      {
        question: amharic ? 'ማዕከሉ ምን ያደርጋል?' : 'What does the center do?',
        answer: amharic
          ? 'ለህጻናትና ለቤተሰቦች ድጋፍ ይሰጣል።'
          : 'We provide practical, family-centered autism support.',
      },
      {
        question: amharic ? 'እንዴት ልገናኝ?' : 'How can I contact the team?',
        answer: amharic ? 'የመገናኛ ገጹን ይጠቀሙ።' : 'Use the contact page to send us a message.',
      },
    ],
  };
}

function resources(language) {
  if (language === 'am') return [];
  return [
    {
      id: '00000000-0000-4000-8000-000000000201',
      title: 'Family autism guide',
      description: 'Practical introductory information for parents and caregivers.',
      fileName: 'family-autism-guide.pdf',
      fileUrl: 'http://127.0.0.1:' + port + '/downloads/family-autism-guide.pdf',
      mimeType: 'application/pdf',
      languageCode: 'en',
      status: 'PUBLISHED',
      downloadCount: 2,
    },
    {
      id: '00000000-0000-4000-8000-000000000202',
      title: 'Activity planner',
      description: 'A simple text planner for family activities.',
      fileName: 'activity-planner.txt',
      fileUrl: 'http://127.0.0.1:' + port + '/downloads/activity-planner.txt',
      mimeType: 'text/plain',
      languageCode: 'en',
      status: 'PUBLISHED',
      downloadCount: 0,
    },
  ];
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

function downloadAsset(response) {
  response.writeHead(200, {
    'content-type': 'application/octet-stream',
    'content-disposition': 'attachment',
  });
  response.end('Trial resource file');
}

function paginated(data, url) {
  const page = Math.max(Number(url?.searchParams.get('page') ?? 1), 1);
  const requestedLimit = Number(url?.searchParams.get('limit') ?? (data.length || 1));
  const limit = Math.max(requestedLimit, 1);
  const offset = (page - 1) * limit;
  return {
    data: url ? data.slice(offset, offset + limit) : data,
    meta: {
      total: data.length,
      page,
      limit,
      totalPages: data.length ? Math.ceil(data.length / limit) : 0,
    },
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
