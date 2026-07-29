import { SiteSetting } from '../../../database/schema';

export interface PublicSiteSettings {
  siteName: string;
  defaultLanguage: SiteSetting['defaultLanguage'];
  supportedLanguages: SiteSetting['supportedLanguages'];
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
}
