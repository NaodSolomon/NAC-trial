import type { Language } from '@/lib/i18n';

export const homeCopy = {
  en: {
    blogTitle: 'Latest stories',
    blogDescription: 'News and practical information from Nehemiah Autism Center.',
    blogAction: 'View all stories',
    readMore: 'Read more',
    eventsTitle: 'Upcoming events',
    eventsDescription: 'Join our community at an upcoming activity.',
    eventsAction: 'View all events',
    galleryTitle: 'Recent moments',
    galleryDescription: 'A glimpse into our programs and community.',
    galleryAction: 'View the gallery',
  },
  am: {
    blogTitle: 'የተቅርብ ጊዜ ታሪኮች',
    blogDescription: 'ከነሕምያ ኦቲዝም ማዕከል ዜናዎችና ጠቃሚ መረጃዎች።',
    blogAction: 'ሁሉንም ታሪኮች ይመልከቱ',
    readMore: 'ተጨማሪ ያንብቡ',
    eventsTitle: 'መጪ ዝግጅቶች',
    eventsDescription: 'በመጪው የማህበረሰብ እንቅስቃሴ ይሳተፉ።',
    eventsAction: 'ሁሉንም ዝግጅቶች ይመልከቱ',
    galleryTitle: 'የቅርብ ጊዜ ቅጽበቶች',
    galleryDescription: 'የፕሮግራሞቻችንንና የማህበረሰባችንን እንቅስቃሴ ይመልከቱ።',
    galleryAction: 'የምስል ማዕከሉን ይመልከቱ',
  },
} satisfies Record<Language, Record<string, string>>;
