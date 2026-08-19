import type { Language } from '@/lib/i18n';

export interface PublicNavigationItem {
  id: string;
  label: string;
  url: string;
  children?: PublicNavigationItem[];
}

export interface PublicSiteSettings {
  siteName: string;
  defaultLanguage: Language;
  supportedLanguages: Language[];
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  openingHours: string | null;
  footerAbout: string | null;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  };
}
