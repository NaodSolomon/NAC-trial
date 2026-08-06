import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import { admins, blogPosts, cmsPages, events } from '../schema';

export const DEMO_SEED_AUTHOR_ID = '00000000-0000-4000-8000-000000000004';

const demoPages = [
  {
    slug: 'home',
    languageCode: 'en' as const,
    title: 'Nehemiah Autism Center',
    content:
      'Nehemiah Autism Center supports autistic children and their families through compassionate services, education, and community.',
    metadata: {
      sections: [
        {
          type: 'hero',
          heading: 'Every child deserves understanding, support, and opportunity',
          body: 'Discover family-centered autism services and a welcoming community in Ethiopia.',
          primaryAction: { label: 'Explore our services', href: '/about' },
          secondaryAction: { label: 'Contact us', href: '/contact' },
        },
        {
          type: 'services',
          heading: 'How we support families',
          items: [
            {
              title: 'Family guidance',
              body: 'Practical information and support for parents and caregivers.',
            },
            {
              title: 'Learning support',
              body: 'Individualized activities that respect each child’s strengths and needs.',
            },
            {
              title: 'Community awareness',
              body: 'Education that encourages inclusion, acceptance, and understanding.',
            },
          ],
        },
        {
          type: 'callToAction',
          heading: 'Start a conversation with our team',
          body: 'We are here to listen and help you find the right next step.',
          action: { label: 'Get in touch', href: '/contact' },
        },
      ],
    },
    seoTitle: 'Nehemiah Autism Center | Autism Support in Ethiopia',
    seoDescription:
      'Family-centered autism support, education, and community services from Nehemiah Autism Center.',
  },
  {
    slug: 'home',
    languageCode: 'am' as const,
    title: 'ነሕምያ ኦቲዝም ማዕከል',
    content: 'ነሕምያ ኦቲዝም ማዕከል ኦቲዝም ያለባቸውን ህጻናትና ቤተሰቦቻቸውን በእንክብካቤ፣ በትምህርትና በማህበረሰብ ይደግፋል።',
    metadata: {
      sections: [
        {
          type: 'hero',
          heading: 'እያንዳንዱ ህጻን መረዳት፣ ድጋፍና እድል ይገባዋል',
          body: 'በኢትዮጵያ ቤተሰብን ማዕከል ያደረጉ የኦቲዝም አገልግሎቶችንና ተቀባይ ማህበረሰብን ይወቁ።',
          primaryAction: { label: 'አገልግሎቶቻችንን ይወቁ', href: '/about' },
          secondaryAction: { label: 'ያግኙን', href: '/contact' },
        },
        {
          type: 'services',
          heading: 'ቤተሰቦችን የምንደግፍባቸው መንገዶች',
          items: [
            {
              title: 'የቤተሰብ ምክር',
              body: 'ለወላጆችና ለተንከባካቢዎች ተግባራዊ መረጃና ድጋፍ።',
            },
            {
              title: 'የትምህርት ድጋፍ',
              body: 'የእያንዳንዱን ህጻን ጥንካሬና ፍላጎት የሚያከብሩ የግል እንቅስቃሴዎች።',
            },
            {
              title: 'የማህበረሰብ ግንዛቤ',
              body: 'አካታችነትን፣ ተቀባይነትንና መረዳትን የሚያዳብር ትምህርት።',
            },
          ],
        },
        {
          type: 'callToAction',
          heading: 'ከቡድናችን ጋር ውይይት ይጀምሩ',
          body: 'ልንሰማዎትና ትክክለኛውን ቀጣይ እርምጃ እንዲያገኙ ለመርዳት ዝግጁ ነን።',
          action: { label: 'ያግኙን', href: '/contact' },
        },
      ],
    },
    seoTitle: 'ነሕምያ ኦቲዝም ማዕከል | በኢትዮጵያ የኦቲዝም ድጋፍ',
    seoDescription: 'ከነሕምያ ኦቲዝም ማዕከል ቤተሰብን ማዕከል ያደረገ የኦቲዝም ድጋፍ፣ ትምህርትና የማህበረሰብ አገልግሎቶች።',
  },
  {
    slug: 'about',
    languageCode: 'en' as const,
    title: 'About Nehemiah Autism Center',
    content:
      'Nehemiah Autism Center supports autistic children and their families through practical guidance, learning support, advocacy, and inclusive community activities.\n\nOur work is family-centered. We listen to each family, respect every child’s strengths, and help communities build greater understanding and acceptance.',
    metadata: {},
    seoTitle: 'About Nehemiah Autism Center',
    seoDescription:
      'Learn about Nehemiah Autism Center and its family-centered autism support in Ethiopia.',
  },
  {
    slug: 'about',
    languageCode: 'am' as const,
    title: 'ስለ ነህምያ ኦቲዝም ማዕከል',
    content:
      'ነህምያ ኦቲዝም ማዕከል ኦቲዝም ያለባቸውን ህጻናትና ቤተሰቦቻቸውን በተግባራዊ ምክር፣ በትምህርት ድጋፍ፣ በጥብቅና እና በአካታች የማህበረሰብ እንቅስቃሴዎች ይደግፋል።\n\nሥራችን ቤተሰብን ማዕከል ያደረገ ነው። እያንዳንዱን ቤተሰብ እናዳምጣለን፣ የእያንዳንዱን ህጻን ጥንካሬ እናከብራለን።',
    metadata: {},
    seoTitle: 'ስለ ነህምያ ኦቲዝም ማዕከል',
    seoDescription: 'በኢትዮጵያ ስላለው የነህምያ ኦቲዝም ማዕከል የቤተሰብ ድጋፍ ይወቁ።',
  },
  {
    slug: 'faq',
    languageCode: 'en' as const,
    title: 'Frequently Asked Questions',
    content:
      'Find introductory answers about Nehemiah Autism Center and how families can connect with us.',
    metadata: {
      items: [
        {
          question: 'What does Nehemiah Autism Center do?',
          answer:
            'We provide family-centered autism support, practical guidance, learning opportunities, and community awareness activities.',
        },
        {
          question: 'How can I ask for support?',
          answer:
            'Use the contact page to send the team a message. A team member will follow up using the details you provide.',
        },
        {
          question: 'Do I need an account to use this website?',
          answer:
            'No. Public information, events, resources, and contact forms are available without creating an account.',
        },
        {
          question: 'Can I volunteer with the center?',
          answer:
            'Yes. Visit the volunteer page to learn about current opportunities and submit your interest.',
        },
      ],
    },
    seoTitle: 'Frequently Asked Questions | Nehemiah Autism Center',
    seoDescription:
      'Answers to common questions about Nehemiah Autism Center, family support, website access, and volunteering.',
  },
  {
    slug: 'faq',
    languageCode: 'am' as const,
    title: 'ተደጋጋሚ ጥያቄዎች',
    content: 'ስለ ነህምያ ኦቲዝም ማዕከልና ቤተሰቦች ከእኛ ጋር እንዴት መገናኘት እንደሚችሉ መልሶችን ያግኙ።',
    metadata: {
      items: [
        {
          question: 'ነህምያ ኦቲዝም ማዕከል ምን ያደርጋል?',
          answer:
            'ቤተሰብን ማዕከል ያደረገ የኦቲዝም ድጋፍ፣ ተግባራዊ ምክር፣ የትምህርት ዕድሎችና የማህበረሰብ ግንዛቤ እንቅስቃሴዎችን እናቀርባለን።',
        },
        {
          question: 'ድጋፍ እንዴት መጠየቅ እችላለሁ?',
          answer: 'ለቡድናችን መልእክት ለመላክ የመገናኛ ገጹን ይጠቀሙ። የቡድን አባል ባቀረቡት መረጃ ያነጋግርዎታል።',
        },
      ],
    },
    seoTitle: 'ተደጋጋሚ ጥያቄዎች | ነህምያ ኦቲዝም ማዕከል',
    seoDescription: 'ስለ ነህምያ ኦቲዝም ማዕከልና የቤተሰብ ድጋፍ የተለመዱ ጥያቄዎች መልሶች።',
  },
] as const;

const demoBlogPosts = [
  {
    slug: 'understanding-autism-together',
    languageCode: 'en' as const,
    title: 'Understanding autism together',
    excerpt: 'Practical ways families and communities can build understanding and inclusion.',
    content:
      'Understanding begins by listening to autistic people and their families.\n\nSmall, consistent acts of acceptance can make schools, homes, and communities more welcoming.',
    seoTitle: 'Understanding Autism Together | Nehemiah Autism Center',
    seoDescription:
      'Practical guidance for building autism understanding and inclusion in families and communities.',
  },
  {
    slug: 'family-centered-support',
    languageCode: 'en' as const,
    title: 'What family-centered support means',
    excerpt: 'Why listening to each family is central to respectful and practical support.',
    content:
      'Every family has different strengths, questions, and priorities.\n\nFamily-centered support starts with listening and builds a practical plan around the child and caregivers.',
    seoTitle: 'Family-Centered Autism Support | Nehemiah Autism Center',
    seoDescription: 'Learn how family-centered autism support respects each child and caregiver.',
  },
  {
    slug: 'inclusive-community-activities',
    languageCode: 'en' as const,
    title: 'Creating inclusive community activities',
    excerpt: 'Simple considerations that help more children and families take part comfortably.',
    content:
      'Inclusive activities offer clear information, flexible ways to participate, and quiet spaces when possible.\n\nPlanning with families helps organizers remove barriers before an event begins.',
    seoTitle: 'Inclusive Community Activities | Nehemiah Autism Center',
    seoDescription: 'Ideas for making community activities more welcoming for autistic children.',
  },
  {
    slug: 'understanding-autism-together',
    languageCode: 'am' as const,
    title: 'ኦቲዝምን በጋራ መረዳት',
    excerpt: 'ቤተሰቦችና ማህበረሰቦች ግንዛቤንና አካታችነትን የሚያዳብሩባቸው ተግባራዊ መንገዶች።',
    content:
      'መረዳት የሚጀምረው ኦቲዝም ያለባቸውን ሰዎችና ቤተሰቦቻቸውን በማዳመጥ ነው።\n\nተከታታይ የተቀባይነት ተግባራት ትምህርት ቤቶችንና ማህበረሰቦችን የበለጠ አካታች ያደርጋሉ።',
    seoTitle: 'ኦቲዝምን በጋራ መረዳት | ነህምያ ኦቲዝም ማዕከል',
    seoDescription: 'በቤተሰብና በማህበረሰብ ውስጥ የኦቲዝም ግንዛቤን ለማዳበር ተግባራዊ መረጃ።',
  },
] as const;

const demoEvents = [
  {
    translationKey: '00000000-0000-4000-8000-000000000501',
    slug: 'family-support-day',
    languageCode: 'en' as const,
    title: 'Family support day',
    description:
      'A welcoming day for families to connect, share practical ideas, and learn about the center.',
    startDate: new Date('2030-01-15T06:00:00.000Z'),
    endDate: new Date('2030-01-15T10:00:00.000Z'),
    location: 'Nehemiah Autism Center, Addis Ababa',
    rsvpEnabled: true,
  },
  {
    translationKey: '00000000-0000-4000-8000-000000000501',
    slug: 'family-support-day',
    languageCode: 'am' as const,
    title: 'የቤተሰብ ድጋፍ ቀን',
    description: 'ቤተሰቦች የሚገናኙበት፣ ተግባራዊ ሐሳቦችን የሚጋሩበትና ስለ ማዕከሉ የሚማሩበት አካታች ቀን።',
    startDate: new Date('2030-01-15T06:00:00.000Z'),
    endDate: new Date('2030-01-15T10:00:00.000Z'),
    location: 'ነህምያ ኦቲዝም ማዕከል፣ አዲስ አበባ',
    rsvpEnabled: true,
  },
  {
    translationKey: '00000000-0000-4000-8000-000000000502',
    slug: 'community-awareness-workshop',
    languageCode: 'en' as const,
    title: 'Community awareness workshop',
    description: 'A practical workshop about autism understanding, acceptance, and inclusion.',
    startDate: new Date('2030-02-20T06:00:00.000Z'),
    endDate: new Date('2030-02-20T09:00:00.000Z'),
    location: 'Nehemiah Autism Center, Addis Ababa',
    rsvpEnabled: false,
  },
  {
    translationKey: '00000000-0000-4000-8000-000000000502',
    slug: 'community-awareness-workshop',
    languageCode: 'am' as const,
    title: 'የማህበረሰብ ግንዛቤ ወርክሾፕ',
    description: 'ስለ ኦቲዝም ግንዛቤ፣ ተቀባይነትና አካታችነት ተግባራዊ ወርክሾፕ።',
    startDate: new Date('2030-02-20T06:00:00.000Z'),
    endDate: new Date('2030-02-20T09:00:00.000Z'),
    location: 'ነህምያ ኦቲዝም ማዕከል፣ አዲስ አበባ',
    rsvpEnabled: false,
  },
  {
    translationKey: '00000000-0000-4000-8000-000000000503',
    slug: 'past-family-gathering',
    languageCode: 'en' as const,
    title: 'Past family gathering',
    description: 'A completed gathering kept public as part of the center event archive.',
    startDate: new Date('2025-05-10T06:00:00.000Z'),
    endDate: new Date('2025-05-10T10:00:00.000Z'),
    location: 'Nehemiah Autism Center, Addis Ababa',
    rsvpEnabled: false,
  },
  {
    translationKey: '00000000-0000-4000-8000-000000000503',
    slug: 'past-family-gathering',
    languageCode: 'am' as const,
    title: 'ያለፈ የቤተሰብ ስብሰባ',
    description: 'የማዕከሉ የዝግጅት ማህደር አካል ሆኖ የቀረ የተጠናቀቀ የቤተሰብ ስብሰባ።',
    startDate: new Date('2025-05-10T06:00:00.000Z'),
    endDate: new Date('2025-05-10T10:00:00.000Z'),
    location: 'ነህምያ ኦቲዝም ማዕከል፣ አዲስ አበባ',
    rsvpEnabled: false,
  },
] as const;

export async function seedDemoContent(database: NodePgDatabase<typeof schema>): Promise<void> {
  await database.transaction(async (transaction) => {
    await transaction
      .insert(admins)
      .values({
        id: DEMO_SEED_AUTHOR_ID,
        name: 'Demo Content Seed',
        email: 'demo-content-seed@nehemiah.invalid',
        // This inactive technical author exists only to satisfy CMS ownership.
        passwordHash: 'NO_LOGIN_CREDENTIAL_EXISTS_FOR_THIS_INACTIVE_ACCOUNT',
        role: 'CONTENT_EDITOR',
        isActive: false,
      })
      .onConflictDoNothing({ target: admins.id });

    const publishedAt = new Date();
    await transaction
      .insert(cmsPages)
      .values(
        demoPages.map((page) => ({
          ...page,
          status: 'PUBLISHED' as const,
          publishedAt,
          createdBy: DEMO_SEED_AUTHOR_ID,
        })),
      )
      .onConflictDoNothing({
        target: [cmsPages.slug, cmsPages.languageCode],
      });

    await transaction
      .insert(blogPosts)
      .values(
        demoBlogPosts.map((post) => ({
          ...post,
          status: 'PUBLISHED' as const,
          publishedAt,
          createdBy: DEMO_SEED_AUTHOR_ID,
        })),
      )
      .onConflictDoNothing({ target: [blogPosts.slug, blogPosts.languageCode] });

    await transaction
      .insert(events)
      .values(
        demoEvents.map((event) => ({
          ...event,
          status: 'PUBLISHED' as const,
          createdBy: DEMO_SEED_AUTHOR_ID,
        })),
      )
      .onConflictDoNothing({ target: [events.slug, events.languageCode] });
  });
}
