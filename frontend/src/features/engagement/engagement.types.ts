import type { z } from 'zod';
import type {
  contactFormSchema,
  newsletterFormSchema,
  volunteerFormSchema,
} from './engagement.schemas';

export interface PublicContactPage {
  title: string;
  description: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  mapEmbedUrl: string | null;
  languageCode: 'en' | 'am';
}

export interface PublicVolunteerPage {
  title: string;
  description: string;
  languageCode: 'en' | 'am';
}

export interface PublicTestimonial {
  id: string;
  name: string;
  text: string;
  languageCode: 'en' | 'am';
  status: 'PUBLISHED';
}

export type ContactFormValues = z.infer<ReturnType<typeof contactFormSchema>>;
export type VolunteerFormValues = z.infer<ReturnType<typeof volunteerFormSchema>>;
export type NewsletterFormValues = z.infer<ReturnType<typeof newsletterFormSchema>>;
