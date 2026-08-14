import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import {
  admins,
  blogPosts,
  cmsPages,
  events,
  galleryItems,
  mediaAssets,
  mediaTranslations,
  resources,
  testimonials,
} from '../schema';

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
          type: 'location',
          heading: 'Find us in Addis Ababa',
          body: 'The map is loaded only after you choose to connect to Google Maps.',
          mapEmbedUrl: 'https://www.google.com/maps?q=Addis+Ababa,+Ethiopia&output=embed',
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
          type: 'location',
          heading: 'በአዲስ አበባ ያግኙን',
          body: 'ካርታው ከGoogle Maps ጋር የሚገናኘው እርስዎ እንዲጫን ከመረጡ በኋላ ብቻ ነው።',
          mapEmbedUrl: 'https://www.google.com/maps?q=Addis+Ababa,+Ethiopia&output=embed',
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
    metadata: {
      contentApproved: false,
      about: {
        mission: {
          heading: 'Our mission',
          body: 'Increase autism awareness, provide structured information and connect autistic children and their families with respectful support.',
        },
        history: {
          heading: 'Our history',
          body: "The center's founding history and milestones require final approval from Nehemiah Autism Center before production launch. This trial text must not be treated as an organizational record.",
        },
        services: [
          { title: 'Family guidance', body: 'Practical information for parents and caregivers.' },
          {
            title: 'Learning support',
            body: 'Activities that respect individual strengths and needs.',
          },
          {
            title: 'Community awareness',
            body: 'Education that promotes understanding and inclusion.',
          },
        ],
      },
    },
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
    metadata: {
      contentApproved: false,
      about: {
        mission: {
          heading: 'ተልዕኳችን',
          body: 'ስለ ኦቲዝም ግንዛቤን ማሳደግ፣ የተደራጀ መረጃ ማቅረብ እና ኦቲዝም ያለባቸውን ሕፃናትና ቤተሰቦቻቸውን ከአክብሮት ጋር ከሚሰጥ ድጋፍ ጋር ማገናኘት።',
        },
        history: {
          heading: 'ታሪካችን',
          body: 'የማዕከሉ የምስረታ ታሪክና ዋና ዋና ክንውኖች ከምርት ስርጭት በፊት በነህምያ ኦቲዝም ማዕከል መጽደቅ አለባቸው። ይህ የሙከራ ጽሑፍ እንደ ድርጅቱ ታሪክ መወሰድ የለበትም።',
        },
        services: [
          { title: 'የቤተሰብ ምክር', body: 'ለወላጆችና ለተንከባካቢዎች ተግባራዊ መረጃ።' },
          { title: 'የትምህርት ድጋፍ', body: 'የግለሰብን ጥንካሬና ፍላጎት የሚያከብሩ እንቅስቃሴዎች።' },
          { title: 'የማህበረሰብ ግንዛቤ', body: 'መረዳትንና አካታችነትን የሚያበረታታ ትምህርት።' },
        ],
      },
    },
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
  {
    slug: 'contact',
    languageCode: 'en' as const,
    title: 'Contact Nehemiah Autism Center',
    content:
      'Send our team a message about services, family support, partnerships, or visiting the center. We will respond using only the contact information you provide.',
    metadata: {
      mapEmbedUrl: 'https://www.google.com/maps?q=Addis+Ababa,+Ethiopia&output=embed',
    },
    seoTitle: 'Contact Nehemiah Autism Center',
    seoDescription: 'Contact Nehemiah Autism Center in Addis Ababa, Ethiopia.',
  },
  {
    slug: 'contact',
    languageCode: 'am' as const,
    title: 'ነህምያ ኦቲዝም ማዕከልን ያነጋግሩ',
    content: 'ስለ አገልግሎቶች፣ የቤተሰብ ድጋፍ፣ አጋርነት ወይም ማዕከሉን ስለመጎብኘት ለቡድናችን መልእክት ይላኩ።',
    metadata: {
      mapEmbedUrl: 'https://www.google.com/maps?q=Addis+Ababa,+Ethiopia&output=embed',
    },
    seoTitle: 'ነህምያ ኦቲዝም ማዕከልን ያነጋግሩ',
    seoDescription: 'በአዲስ አበባ ያለውን ነህምያ ኦቲዝም ማዕከል ያነጋግሩ።',
  },
  {
    slug: 'volunteer',
    languageCode: 'en' as const,
    title: 'Volunteer with Nehemiah Autism Center',
    content:
      'Volunteers can support inclusive events, family activities, administration, and community awareness. Tell us about your interests and availability so the team can consider suitable opportunities.',
    metadata: {
      volunteerRoles: [
        {
          title: 'Inclusive event support',
          summary: 'Help the team prepare welcoming, organized community and family activities.',
          commitment: 'Scheduled around individual events',
        },
        {
          title: 'Community awareness support',
          summary:
            'Assist with accessible information, outreach materials, and awareness activities.',
          commitment: 'Flexible project-based support',
        },
        {
          title: 'Administrative support',
          summary: 'Support non-clinical organization and routine office activities when needed.',
          commitment: 'Agreed with the center before placement',
        },
      ],
    },
    seoTitle: 'Volunteer | Nehemiah Autism Center',
    seoDescription: 'Register your interest in volunteering with Nehemiah Autism Center.',
  },
  {
    slug: 'volunteer',
    languageCode: 'am' as const,
    title: 'ከነህምያ ኦቲዝም ማዕከል ጋር በበጎ ፈቃድ ይስሩ',
    content: 'በጎ ፈቃደኞች አካታች ዝግጅቶችን፣ የቤተሰብ እንቅስቃሴዎችንና የማህበረሰብ ግንዛቤን መደገፍ ይችላሉ። ስለ ፍላጎትዎና ጊዜዎ ይንገሩን።',
    metadata: {
      volunteerRoles: [
        {
          title: 'የአካታች ዝግጅት ድጋፍ',
          summary: 'ቡድኑ ተቀባይና የተደራጀ የማህበረሰብ እና የቤተሰብ እንቅስቃሴ እንዲያዘጋጅ ያግዙ።',
          commitment: 'በእያንዳንዱ ዝግጅት መርሐ ግብር መሠረት',
        },
        {
          title: 'የማህበረሰብ ግንዛቤ ድጋፍ',
          summary: 'ተደራሽ መረጃ፣ የማስተዋወቂያ ቁሳቁስና የግንዛቤ እንቅስቃሴዎችን ያግዙ።',
          commitment: 'በፕሮጀክት ላይ የተመሠረተ ተለዋዋጭ ጊዜ',
        },
        {
          title: 'የአስተዳደር ድጋፍ',
          summary: 'እንደ አስፈላጊነቱ ክሊኒካዊ ያልሆኑ የማደራጀትና የቢሮ ሥራዎችን ያግዙ።',
          commitment: 'ቦታ ከመሰጠቱ በፊት ከማዕከሉ ጋር የሚስማማ',
        },
      ],
    },
    seoTitle: 'በጎ ፈቃደኝነት | ነህምያ ኦቲዝም ማዕከል',
    seoDescription: 'ከነህምያ ኦቲዝም ማዕከል ጋር በበጎ ፈቃድ ለመስራት ፍላጎትዎን ይግለጹ።',
  },
  {
    slug: 'team',
    languageCode: 'en' as const,
    title: 'Our Team',
    content:
      'This draft intentionally contains no names or biographies. Nehemiah Autism Center must approve bilingual team information before this page can be published.',
    metadata: { contentApproved: false },
    status: 'DRAFT' as const,
    seoTitle: 'Our Team | Nehemiah Autism Center',
    seoDescription: 'Meet the approved Nehemiah Autism Center team.',
  },
  {
    slug: 'team',
    languageCode: 'am' as const,
    title: 'ቡድናችን',
    content:
      'ይህ ረቂቅ ሆን ተብሎ ስሞችንና የሕይወት ታሪኮችን አልያዘም። ይህ ገጽ ከመታተሙ በፊት ነህምያ ኦቲዝም ማዕከል በሁለቱም ቋንቋዎች የቡድን መረጃውን ማጽደቅ አለበት።',
    metadata: { contentApproved: false },
    status: 'DRAFT' as const,
    seoTitle: 'ቡድናችን | ነህምያ ኦቲዝም ማዕከል',
    seoDescription: 'የተፈቀደውን የነህምያ ኦቲዝም ማዕከል ቡድን ይወቁ።',
  },
] as const;

const demoTestimonials = [
  {
    translationKey: '00000000-0000-4000-8000-000000000801',
    languageCode: 'en' as const,
    name: 'A parent from Addis Ababa',
    text: 'The center listened to our family and helped us understand practical next steps with respect and patience.',
  },
  {
    translationKey: '00000000-0000-4000-8000-000000000801',
    languageCode: 'am' as const,
    name: 'ከአዲስ አበባ የመጣ ወላጅ',
    text: 'ማዕከሉ ቤተሰባችንን አዳመጠን በአክብሮትና በትዕግሥት ተግባራዊ ቀጣይ እርምጃዎችን እንድንረዳ ረዳን።',
  },
  {
    translationKey: '00000000-0000-4000-8000-000000000802',
    languageCode: 'en' as const,
    name: 'Community volunteer',
    text: 'Volunteering here showed me how thoughtful planning can make community activities welcoming for more families.',
  },
  {
    translationKey: '00000000-0000-4000-8000-000000000802',
    languageCode: 'am' as const,
    name: 'የማህበረሰብ በጎ ፈቃደኛ',
    text: 'እዚህ በበጎ ፈቃድ መስራቴ የታሰበበት ዝግጅት ለብዙ ቤተሰቦች ተቀባይ እንቅስቃሴ እንደሚፈጥር አሳየኝ።',
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

const demoMedia = [
  {
    id: '00000000-0000-4000-8000-000000000901',
    objectKey: 'demo/gallery-family-support-en.jpg',
    originalName: 'gallery-family-support-en.jpg',
    sizeBytes: 31_944,
    altText: 'Trial gallery sample; replace with approved Nehemiah Autism Center media.',
    caption: 'Trial media for local demonstration only.',
    languageCode: 'en' as const,
    title: 'Trial gallery sample',
  },
  {
    id: '00000000-0000-4000-8000-000000000902',
    objectKey: 'demo/gallery-community-en.jpg',
    originalName: 'gallery-community-en.jpg',
    sizeBytes: 24_455,
    altText: 'Second trial gallery sample; replace with approved center media.',
    caption: 'Trial media for local demonstration only.',
    languageCode: 'en' as const,
    title: 'Trial community sample',
  },
  {
    id: '00000000-0000-4000-8000-000000000903',
    objectKey: 'demo/gallery-family-support-am.jpg',
    originalName: 'gallery-family-support-am.jpg',
    sizeBytes: 31_944,
    altText: 'የሙከራ የምስል ማዕከል ናሙና፤ በተፈቀደ የማዕከሉ ሚዲያ ይተኩ።',
    caption: 'ለአካባቢ ሙከራ ብቻ የተዘጋጀ ሚዲያ።',
    languageCode: 'am' as const,
    title: 'የሙከራ ምስል ናሙና',
  },
  {
    id: '00000000-0000-4000-8000-000000000904',
    objectKey: 'demo/gallery-community-am.jpg',
    originalName: 'gallery-community-am.jpg',
    sizeBytes: 24_455,
    altText: 'ሁለተኛ የሙከራ ምስል ናሙና፤ በተፈቀደ የማዕከሉ ሚዲያ ይተኩ።',
    caption: 'ለአካባቢ ሙከራ ብቻ የተዘጋጀ ሚዲያ።',
    languageCode: 'am' as const,
    title: 'የሙከራ ማህበረሰብ ናሙና',
  },
] as const;

const demoResources = [
  {
    id: '00000000-0000-4000-8000-000000000911',
    title: 'Trial family resource',
    description:
      'A local demonstration download. Replace it with an approved Nehemiah Autism Center resource before launch.',
    objectKey: 'demo/resources/trial-family-resource-en.txt',
    fileName: 'trial-family-resource-en.txt',
    languageCode: 'en' as const,
  },
  {
    id: '00000000-0000-4000-8000-000000000912',
    title: 'የሙከራ የቤተሰብ ግብዓት',
    description: 'የአካባቢ ማሳያ ውርድ። ከማስጀመር በፊት በተፈቀደ የነህምያ ኦቲዝም ማዕከል ግብዓት ይተኩት።',
    objectKey: 'demo/resources/trial-family-resource-am.txt',
    fileName: 'trial-family-resource-am.txt',
    languageCode: 'am' as const,
  },
] as const;

export async function seedDemoContent(database: NodePgDatabase<typeof schema>): Promise<void> {
  const storagePublicUrl = (
    process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:9000/nehemiah-media'
  ).replace(/\/+$/, '');
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
        demoPages.map((page) => {
          const status = 'status' in page ? page.status : ('PUBLISHED' as const);
          return {
            ...page,
            status,
            publishedAt: status === 'PUBLISHED' ? publishedAt : null,
            createdBy: DEMO_SEED_AUTHOR_ID,
          };
        }),
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

    await transaction
      .insert(testimonials)
      .values(
        demoTestimonials.map((testimonial) => ({
          ...testimonial,
          status: 'PUBLISHED' as const,
          createdBy: DEMO_SEED_AUTHOR_ID,
        })),
      )
      .onConflictDoNothing({
        target: [testimonials.translationKey, testimonials.languageCode],
      });

    await transaction
      .insert(mediaAssets)
      .values(
        demoMedia.map((media) => ({
          id: media.id,
          objectKey: media.objectKey,
          publicUrl: `${storagePublicUrl}/${media.objectKey}`,
          originalName: media.originalName,
          mimeType: 'image/jpeg',
          sizeBytes: media.sizeBytes,
          type: 'IMAGE' as const,
          uploadedBy: DEMO_SEED_AUTHOR_ID,
        })),
      )
      .onConflictDoNothing({ target: mediaAssets.id });

    await transaction
      .insert(mediaTranslations)
      .values(
        demoMedia.map((media) => ({
          mediaId: media.id,
          languageCode: media.languageCode,
          altText: media.altText,
          caption: media.caption,
        })),
      )
      .onConflictDoNothing({
        target: [mediaTranslations.mediaId, mediaTranslations.languageCode],
      });

    await transaction
      .insert(galleryItems)
      .values(
        demoMedia.map((media) => ({
          mediaId: media.id,
          title: media.title,
          altText: media.altText,
          languageCode: media.languageCode,
          createdBy: DEMO_SEED_AUTHOR_ID,
        })),
      )
      .onConflictDoNothing({ target: galleryItems.mediaId });

    await transaction
      .insert(resources)
      .values(
        demoResources.map((resource) => ({
          id: resource.id,
          title: resource.title,
          description: resource.description,
          fileUrl: `${storagePublicUrl}/${resource.objectKey}`,
          fileName: resource.fileName,
          mimeType: 'text/plain',
          languageCode: resource.languageCode,
          status: 'PUBLISHED' as const,
          createdBy: DEMO_SEED_AUTHOR_ID,
        })),
      )
      .onConflictDoNothing({ target: resources.id });
  });
}
