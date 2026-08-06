import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import { admins, cmsPages } from '../schema';

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
  });
}
