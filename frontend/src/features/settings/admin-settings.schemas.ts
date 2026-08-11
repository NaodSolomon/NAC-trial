import { z } from 'zod';

const socialLinksSchema = z.object({
  facebook: z.string().default(''),
  instagram: z.string().default(''),
  youtube: z.string().default(''),
  linkedin: z.string().default(''),
});

export const siteSettingsSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  siteName: z.string(),
  defaultLanguage: z.enum(['en', 'am']),
  supportedLanguages: z.array(z.enum(['en', 'am'])),
  contactEmail: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  socialLinks: z
    .object({
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      youtube: z.string().optional(),
      linkedin: z.string().optional(),
    })
    .default({}),
  updatedBy: z.string().uuid().nullable(),
  createdAt: z.coerce.date().transform((value) => value.toISOString()),
  updatedAt: z.coerce.date().transform((value) => value.toISOString()),
});

const optionalHttpsUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => !value || /^https:\/\/\S+$/i.test(value), 'Social links must use HTTPS.');

export const settingsEditorSchema = z
  .object({
    siteName: z.string().trim().min(2).max(150),
    defaultLanguage: z.enum(['en', 'am']),
    supportedLanguages: z
      .array(z.enum(['en', 'am']))
      .min(1)
      .max(2),
    contactEmail: z.string().trim().email().max(255),
    phone: z.string().trim().max(50),
    address: z.string().trim().max(500),
    socialLinks: socialLinksSchema.extend({
      facebook: optionalHttpsUrl,
      instagram: optionalHttpsUrl,
      youtube: optionalHttpsUrl,
      linkedin: optionalHttpsUrl,
    }),
  })
  .refine((value) => value.supportedLanguages.includes(value.defaultLanguage), {
    message: 'The default language must also be enabled.',
    path: ['defaultLanguage'],
  });

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type SettingsEditorValues = z.infer<typeof settingsEditorSchema>;

export function settingsEditorValues(settings: SiteSettings): SettingsEditorValues {
  return {
    siteName: settings.siteName,
    defaultLanguage: settings.defaultLanguage,
    supportedLanguages: settings.supportedLanguages,
    contactEmail: settings.contactEmail ?? '',
    phone: settings.phone ?? '',
    address: settings.address ?? '',
    socialLinks: {
      facebook: settings.socialLinks.facebook ?? '',
      instagram: settings.socialLinks.instagram ?? '',
      youtube: settings.socialLinks.youtube ?? '',
      linkedin: settings.socialLinks.linkedin ?? '',
    },
  };
}
