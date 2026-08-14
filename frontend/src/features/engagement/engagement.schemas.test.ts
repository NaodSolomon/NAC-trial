import { describe, expect, it } from 'vitest';
import {
  contactFormSchema,
  isApprovedMapUrl,
  publicContactPageSchema,
  publicVolunteerPageSchema,
  publicTestimonialsSchema,
  volunteerFormSchema,
} from './engagement.schemas';

describe('public engagement contracts', () => {
  it('accepts only HTTPS Google map embed origins', () => {
    expect(isApprovedMapUrl('https://www.google.com/maps?q=Addis&output=embed')).toBe(true);
    expect(isApprovedMapUrl('http://www.google.com/maps')).toBe(false);
    expect(isApprovedMapUrl('https://google.com.attacker.test/maps')).toBe(false);
  });

  it('rejects an unsafe map even if the API regresses', () => {
    expect(() =>
      publicContactPageSchema.parse({
        title: 'Contact',
        description: 'Contact the team.',
        email: 'support@example.org',
        phone: null,
        address: null,
        mapEmbedUrl: 'https://attacker.test/map',
        languageCode: 'en',
      }),
    ).toThrow();
  });

  it('allows only published testimonials and strips private repository fields', () => {
    const parsed = publicTestimonialsSchema.parse({
      data: [
        {
          id: '00000000-0000-4000-8000-000000000811',
          name: 'A parent',
          text: 'The center listened to our family.',
          languageCode: 'en',
          status: 'PUBLISHED',
          createdBy: 'private-administrator-id',
        },
      ],
      meta: { total: 1, page: 1, limit: 6, totalPages: 1 },
    });
    expect(parsed.data[0]).not.toHaveProperty('createdBy');
    expect(() =>
      publicTestimonialsSchema.parse({
        data: [{ ...parsed.data[0], status: 'DRAFT' }],
        meta: { total: 1, page: 1, limit: 6, totalPages: 1 },
      }),
    ).toThrow();
  });

  it('requires bounded structured volunteer roles', () => {
    const page = publicVolunteerPageSchema.parse({
      title: 'Volunteer',
      description: 'Help with current opportunities.',
      languageCode: 'en',
      roles: [
        {
          title: 'Event support',
          summary: 'Help prepare inclusive activities.',
          commitment: 'Per event',
        },
      ],
    });
    expect(page.roles[0]?.title).toBe('Event support');
  });
});

describe('public engagement form validation', () => {
  it('matches backend contact limits and treats the subject as optional', () => {
    expect(
      contactFormSchema('en').parse({
        name: 'Family Member',
        email: 'family@example.org',
        subject: '',
        message: 'Please share more information about family support.',
        languageCode: 'en',
      }).subject,
    ).toBe('');
  });

  it('matches backend volunteer phone and message constraints', () => {
    expect(() =>
      volunteerFormSchema('en').parse({
        name: 'Volunteer',
        email: 'volunteer@example.org',
        phone: 'not-a-phone',
        roleInterest: 'Events',
        message: 'Too short',
        languageCode: 'en',
      }),
    ).toThrow();
  });
});
