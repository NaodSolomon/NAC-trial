import { describe, expect, it } from 'vitest';
import {
  contactListSchema,
  newsletterListSchema,
  testimonialEditorSchema,
  volunteerListSchema,
} from './engagement-admin.schemas';

const meta = { total: 1, page: 1, limit: 10, totalPages: 1 };
const common = {
  id: '00000000-0000-4000-8000-000000004301',
  name: 'Applicant',
  email: 'applicant@example.org',
  languageCode: 'en',
  createdAt: '2026-08-12T09:00:00.000Z',
};

describe('engagement administration schemas', () => {
  it('parses private contact and volunteer records without widening their fields', () => {
    expect(
      contactListSchema.parse({
        data: [{ ...common, subject: null, message: 'A private contact message.' }],
        meta,
      }).data[0].email,
    ).toBe(common.email);
    expect(
      volunteerListSchema.parse({
        data: [
          {
            ...common,
            phone: '+251911000000',
            roleInterest: 'Family support',
            message: 'I would like to help families.',
            status: 'PENDING',
          },
        ],
        meta,
      }).data[0].status,
    ).toBe('PENDING');
  });

  it('rejects malformed subscriber addresses and invalid moderation input', () => {
    expect(() =>
      newsletterListSchema.parse({
        data: [{ ...common, email: 'not-an-email' }],
        meta,
      }),
    ).toThrow();
    expect(
      testimonialEditorSchema.safeParse({
        name: 'A',
        text: 'Too short',
        languageCode: 'en',
        status: 'DRAFT',
      }).success,
    ).toBe(false);
  });
});
