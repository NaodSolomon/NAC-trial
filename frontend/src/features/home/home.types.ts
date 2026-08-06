import type { Language } from '@/lib/i18n';

export interface HomeAction {
  label: string;
  href: string;
}

export interface HomeHeroSection {
  type: 'hero';
  heading: string;
  body: string;
  imageUrl?: string;
  primaryAction: HomeAction;
  secondaryAction?: HomeAction;
}

export interface HomeServicesSection {
  type: 'services';
  heading: string;
  items: Array<{ title: string; body: string }>;
}

export interface HomeCallToActionSection {
  type: 'callToAction';
  heading: string;
  body: string;
  action: HomeAction;
}

export type HomeSection = HomeHeroSection | HomeServicesSection | HomeCallToActionSection;

export interface HomeComposition {
  title: string;
  body: string;
  sections: HomeSection[];
  seo: {
    title: string;
    description: string | null;
    imageUrl: string | null;
  };
}

export interface HomeBlogTeaser {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  publishedAt: string | null;
}

export interface HomeEventTeaser {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  location: string;
  imageUrl: string;
}

export interface HomeGalleryTeaser {
  id: string;
  title: string;
  altText: string;
  mediaUrl: string;
}

export interface HomePageData {
  language: Language;
  composition: HomeComposition;
  blogPosts: HomeBlogTeaser[] | null;
  events: HomeEventTeaser[] | null;
  galleryItems: HomeGalleryTeaser[] | null;
}
