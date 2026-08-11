import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const port = 4010;
const downloadCounts = new Map();
const eventRsvpEmails = new Set();
const demoDonationId = '00000000-0000-4000-8000-000000000901';
let nextDonationSequence = 902;
const donations = new Map([
  [
    demoDonationId,
    {
      id: demoDonationId,
      amount: '50.00',
      currency: 'USD',
      status: 'PENDING',
      gateway: 'PAYPAL',
      createdAt: '2026-08-11T10:00:00.000Z',
    },
  ],
]);

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'access-control-allow-origin': 'http://localhost:3000',
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization',
    });
    return response.end();
  }
  if (url.pathname === '/health') return json(response, { ok: true });
  if (url.pathname.startsWith('/assets/')) return asset(response, url.pathname);
  if (url.pathname.startsWith('/downloads/')) return downloadAsset(response);

  const language = url.searchParams.get('languageCode') === 'am' ? 'am' : 'en';
  if (url.pathname === '/api/v1/system/version') {
    return envelope(response, {
      name: 'Nehemiah Autism Center API',
      version: '0.1.0',
      environment: 'development',
      mode: 'trial',
      adapters: { storage: 'minio', mail: 'mailpit', payment: 'fake', cache: 'redis' },
      realPaymentsEnabled: false,
    });
  }
  if (url.pathname === '/api/v1/public/donations/gateways') {
    return envelope(response, ['PAYPAL']);
  }
  if (url.pathname === '/api/v1/public/donations' && request.method === 'POST') {
    const body = await readJson(request);
    const id = `00000000-0000-4000-8000-${String(nextDonationSequence++).padStart(12, '0')}`;
    const donation = {
      id,
      amount: Number(body.amount).toFixed(2),
      currency: body.currency,
      status: 'PENDING',
      gateway: body.gateway,
      createdAt: new Date().toISOString(),
    };
    donations.set(id, donation);
    return envelope(
      response,
      {
        donationId: id,
        status: 'PENDING',
        paymentUrl: `http://localhost:3000/donate/simulated?donation=${id}`,
      },
      201,
    );
  }
  const donationCancellation = url.pathname.match(
    /^\/api\/v1\/public\/donations\/([0-9a-f-]+)\/cancel$/,
  );
  if (donationCancellation && request.method === 'POST') {
    const donation = donations.get(donationCancellation[1]);
    if (!donation) return json(response, { message: 'Not found' }, 404);
    if (donation.status !== 'PENDING') return json(response, { message: 'Not pending' }, 409);
    donation.status = 'CANCELLED';
    return envelope(response, { status: 'CANCELLED' });
  }
  const trialPayment = url.pathname.match(
    /^\/api\/v1\/test\/payments\/([0-9a-f-]+)\/(confirm|fail)$/,
  );
  if (trialPayment && request.method === 'POST') {
    const donation = donations.get(trialPayment[1]);
    if (!donation) return json(response, { message: 'Not found' }, 404);
    const status = trialPayment[2] === 'confirm' ? 'CONFIRMED' : 'FAILED';
    const duplicate = donation.status === status;
    if (!duplicate && donation.status !== 'PENDING') {
      return json(response, { message: 'Donation is already complete' }, 409);
    }
    donation.status = status;
    return envelope(response, {
      donationId: donation.id,
      status,
      duplicate,
      ...(status === 'CONFIRMED'
        ? { receiptUrl: `http://127.0.0.1:${port}/downloads/test-receipt.pdf` }
        : {}),
    });
  }
  const donationDetail = url.pathname.match(/^\/api\/v1\/public\/donations\/([0-9a-f-]+)$/);
  if (donationDetail && request.method === 'GET') {
    const donation = donations.get(donationDetail[1]);
    return donation
      ? envelope(response, donation)
      : json(response, { success: false, statusCode: 404, message: 'Not found' }, 404);
  }
  if (url.pathname === '/api/v1/public/contact') {
    if (request.method === 'GET') return envelope(response, contactPage(language));
    if (request.method === 'POST') {
      const body = await readJson(request);
      const error = submissionError(body.email);
      if (error) return json(response, error.payload, error.status);
      await delay(120);
      return envelope(response, { status: 'submitted' }, 201);
    }
  }
  if (url.pathname === '/api/v1/public/volunteer') {
    return envelope(response, volunteerPage(language));
  }
  if (url.pathname === '/api/v1/public/volunteer/apply' && request.method === 'POST') {
    const body = await readJson(request);
    const error = submissionError(body.email);
    if (error) return json(response, error.payload, error.status);
    await delay(120);
    return envelope(response, { status: 'submitted' }, 201);
  }
  if (url.pathname === '/api/v1/public/testimonials') {
    return envelope(response, paginated(testimonials(language), url));
  }
  if (url.pathname === '/api/v1/public/newsletter' && request.method === 'POST') {
    const body = await readJson(request);
    const error = submissionError(body.email);
    if (error) return json(response, error.payload, error.status);
    await delay(120);
    return envelope(response, { status: 'subscribed' }, 201);
  }
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
    const timeframe = url.searchParams.get('timeframe') ?? 'upcoming';
    const now = Date.parse('2026-08-06T12:00:00.000Z');
    const filtered = events(language)
      .filter((event) =>
        timeframe === 'past'
          ? Date.parse(event.endDate) < now
          : timeframe === 'all' || Date.parse(event.endDate) > now,
      )
      .sort((left, right) =>
        (url.searchParams.get('sortOrder') ?? 'desc') === 'asc'
          ? Date.parse(left.startDate) - Date.parse(right.startDate)
          : Date.parse(right.startDate) - Date.parse(left.startDate),
      );
    return envelope(response, paginated(filtered, url));
  }
  const eventCalendar = url.pathname.match(/^\/api\/v1\/public\/events\/([^/]+)\/calendar\.ics$/);
  if (eventCalendar) {
    const event = events(language).find(
      (item) => item.slug === decodeURIComponent(eventCalendar[1]),
    );
    if (!event) return json(response, { message: 'Not found' }, 404);
    response.writeHead(200, {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="${event.slug}.ics"`,
      'access-control-allow-origin': 'http://localhost:3000',
    });
    return response.end(
      `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:${event.id}@nehemiah.local\r\nDTSTART:20270114T223000Z\r\nSUMMARY:${event.title}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`,
    );
  }
  const eventRsvp = url.pathname.match(/^\/api\/v1\/public\/events\/([0-9a-f-]+)\/rsvp$/);
  if (eventRsvp && request.method === 'POST') {
    const event = events(language).find((item) => item.id === eventRsvp[1]);
    if (!event)
      return json(response, { success: false, statusCode: 404, message: 'Not found' }, 404);
    const body = await readJson(request);
    const key = `${event.id}:${String(body.email ?? '').toLowerCase()}`;
    if (eventRsvpEmails.has(key)) {
      return json(
        response,
        { success: false, statusCode: 409, message: 'Already registered' },
        409,
      );
    }
    eventRsvpEmails.add(key);
    return envelope(response, { status: 'confirmed' }, 201);
  }
  const eventDetail = url.pathname.match(/^\/api\/v1\/public\/events\/([^/]+)$/);
  if (eventDetail) {
    const event = events(language).find((item) => item.slug === decodeURIComponent(eventDetail[1]));
    return event
      ? envelope(response, event)
      : json(response, { success: false, statusCode: 404, message: 'Not found' }, 404);
  }
  if (url.pathname === '/api/v1/public/gallery') {
    const requestedType = url.searchParams.get('type');
    const filtered = gallery(language).filter(
      (item) => !requestedType || item.type === requestedType,
    );
    return envelope(response, paginated(filtered, url));
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
  const definitions = [
    {
      slug: 'family-support-day',
      start: '2027-01-14T22:30:00.000Z',
      end: '2027-01-15T02:30:00.000Z',
    },
    {
      slug: 'community-awareness-workshop',
      start: '2027-02-20T06:00:00.000Z',
      end: '2027-02-20T09:00:00.000Z',
    },
    {
      slug: 'inclusive-learning-forum',
      start: '2027-03-12T08:00:00.000Z',
      end: '2027-03-12T11:00:00.000Z',
    },
    {
      slug: 'past-family-gathering',
      start: '2025-05-10T06:00:00.000Z',
      end: '2025-05-10T10:00:00.000Z',
    },
  ];
  return definitions.map((definition, index) => ({
    id: `00000000-0000-4000-8000-00000000040${index + 1}`,
    slug: definition.slug,
    languageCode: language,
    title:
      language === 'am'
        ? `የማህበረሰብ ዝግጅት ${index + 1}`
        : index === 0
          ? 'Family support day'
          : index === 3
            ? 'Past family gathering'
            : `Community event ${index + 1}`,
    description:
      language === 'am'
        ? 'ቤተሰቦችን የሚያገናኝ ዝግጅት።'
        : 'An inclusive activity for families and supporters. <script>private-rsvp@example.org</script>',
    startDate: definition.start,
    endDate: definition.end,
    location: language === 'am' ? 'አዲስ አበባ' : 'Nehemiah Autism Center, Addis Ababa',
    rsvpEnabled: index === 0,
    status: 'PUBLISHED',
  }));
}

function gallery(language) {
  const images = Array.from({ length: 15 }, (_, index) => {
    const number = index + 1;
    return {
      id: `00000000-0000-4000-8000-${String(600 + number).padStart(12, '0')}`,
      mediaId: `00000000-0000-4000-8000-${String(700 + number).padStart(12, '0')}`,
      title: language === 'am' ? `የማህበረሰብ ቅጽበት ${number}` : `Community moment ${number}`,
      altText:
        language === 'am'
          ? `በነህምያ ኦቲዝም ማዕከል የተካሄደ የማህበረሰብ እንቅስቃሴ ${number}`
          : `Community activity ${number} at Nehemiah Autism Center`,
      languageCode: language,
      mediaUrl: `http://127.0.0.1:${port}/assets/gallery_${((number - 1) % 8) + 1}.jpg`,
      type: 'IMAGE',
      createdAt: new Date(Date.UTC(2026, 6, number)).toISOString(),
      updatedAt: new Date(Date.UTC(2026, 6, number)).toISOString(),
    };
  });
  const videos = [1, 2].map((number) => ({
    id: `00000000-0000-4000-8000-${String(650 + number).padStart(12, '0')}`,
    mediaId: `00000000-0000-4000-8000-${String(750 + number).padStart(12, '0')}`,
    title: language === 'am' ? `የማዕከሉ ቪዲዮ ${number}` : `Center video ${number}`,
    altText:
      language === 'am'
        ? `በነህምያ ኦቲዝም ማዕከል የተካሄደ እንቅስቃሴ ቪዲዮ ${number}`
        : `Video ${number} showing an activity at Nehemiah Autism Center`,
    languageCode: language,
    mediaUrl: `http://127.0.0.1:${port}/assets/gallery-video-${number}.mp4`,
    type: 'VIDEO',
    createdAt: new Date(Date.UTC(2026, 7, number)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 7, number)).toISOString(),
  }));
  return [...videos, ...images];
}

function contactPage(language) {
  return {
    title: language === 'am' ? 'ነህምያ ኦቲዝም ማዕከልን ያነጋግሩ' : 'Contact Nehemiah Autism Center',
    description:
      language === 'am'
        ? 'ስለ አገልግሎቶች፣ የቤተሰብ ድጋፍ ወይም ማዕከሉን ስለመጎብኘት መልእክት ይላኩ።'
        : 'Send our team a message about services, family support, or visiting the center.',
    email: 'support@nehemiah.org',
    phone: '+251 11 000 0000',
    address: language === 'am' ? 'አዲስ አበባ፣ ኢትዮጵያ' : 'Addis Ababa, Ethiopia',
    mapEmbedUrl: 'https://www.google.com/maps?q=Addis+Ababa,+Ethiopia&output=embed',
    languageCode: language,
  };
}

function volunteerPage(language) {
  return {
    title:
      language === 'am'
        ? 'ከነህምያ ኦቲዝም ማዕከል ጋር በበጎ ፈቃድ ይስሩ'
        : 'Volunteer with Nehemiah Autism Center',
    description:
      language === 'am'
        ? 'በጎ ፈቃደኞች አካታች ዝግጅቶችን፣ የቤተሰብ እንቅስቃሴዎችንና የማህበረሰብ ግንዛቤን መደገፍ ይችላሉ።'
        : 'Volunteers can support inclusive events, family activities, administration, and community awareness.',
    languageCode: language,
  };
}

function testimonials(language) {
  const amharic = language === 'am';
  return [
    {
      id: amharic ? '00000000-0000-4000-8000-000000000812' : '00000000-0000-4000-8000-000000000811',
      name: amharic ? 'ከአዲስ አበባ የመጣ ወላጅ' : 'A parent from Addis Ababa',
      text: amharic
        ? 'ማዕከሉ ቤተሰባችንን አዳመጠን በአክብሮትና በትዕግሥት ረዳን።'
        : 'The center listened to our family and helped us with respect and patience.',
      languageCode: language,
      status: 'PUBLISHED',
      createdBy: 'private-administrator-id',
    },
    {
      id: amharic ? '00000000-0000-4000-8000-000000000814' : '00000000-0000-4000-8000-000000000813',
      name: amharic ? 'የማህበረሰብ በጎ ፈቃደኛ' : 'Community volunteer',
      text: amharic
        ? 'በበጎ ፈቃድ መስራቴ አካታች እንቅስቃሴዎችን እንድረዳ አስችሎኛል።'
        : 'Volunteering helped me understand how thoughtful activities welcome more families.',
      languageCode: language,
      status: 'PUBLISHED',
      createdBy: 'private-administrator-id',
    },
  ];
}

function submissionError(email) {
  if (email === 'rate-limit@example.org') {
    return {
      status: 429,
      payload: { success: false, statusCode: 429, message: 'Too many requests' },
    };
  }
  if (email === 'unavailable@example.org') {
    return {
      status: 503,
      payload: { success: false, statusCode: 503, message: 'Unavailable' },
    };
  }
  return null;
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
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
  if (filename.endsWith('.mp4')) {
    response.writeHead(200, {
      'content-type': 'video/mp4',
      'cache-control': 'public, max-age=60',
    });
    return response.end(Buffer.alloc(0));
  }
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

function envelope(response, data, status = 200) {
  return json(
    response,
    {
      success: true,
      data,
      statusCode: status,
      timestamp: new Date(0).toISOString(),
    },
    status,
  );
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
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
