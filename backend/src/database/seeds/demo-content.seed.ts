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
          primaryAction: { label: 'Explore our services', href: '/services' },
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
