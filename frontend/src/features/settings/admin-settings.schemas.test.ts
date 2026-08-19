import { describe, expect, it } from 'vitest';
import { settingsEditorSchema } from './admin-settings.schemas';

const valid = {
  siteName: 'Nehemiah Autism Center',
  defaultLanguage: 'en' as const,
  supportedLanguages: ['en', 'am'] as Array<'en' | 'am'>,
  contactEmail: 'info@example.org',
  phone: '+251 11 000 0000',
  address: 'Addis Ababa',
  socialLinks: { facebook: '', instagram: '', youtube: '', linkedin: '', x: '', tiktok: '' },
  defaultShareImageUrl: '',
  pageBanners: { gallery: '', blog: '', events: '' },
  localizedText: {
    openingHours: { en: '', am: '' },
    tagline: { en: '', am: '' },
    footerAbout: { en: '', am: '' },
    faqIntro: { en: '', am: '' },
  },
};

describe('settingsEditorSchema', () => {
  it('requires the default language to remain enabled', () => {
    expect(settingsEditorSchema.safeParse({ ...valid, supportedLanguages: ['am'] }).success).toBe(
      false,
    );
  });

  it('accepts HTTPS social links and rejects insecure URLs', () => {
    expect(
      settingsEditorSchema.safeParse({
        ...valid,
        socialLinks: { ...valid.socialLinks, facebook: 'https://facebook.com/nehemiah' },
      }).success,
    ).toBe(true);
    expect(
      settingsEditorSchema.safeParse({
        ...valid,
        socialLinks: { ...valid.socialLinks, facebook: 'http://facebook.com/nehemiah' },
      }).success,
    ).toBe(false);
  });
});
