import { describe, expect, it } from 'vitest';
import { publicEventSchema, rsvpInputSchema } from './event.schemas';

const publishedEvent = {
  id: '00000000-0000-4000-8000-000000000401',
  slug: 'family-support-day',
  title: 'Family support day',
  description: 'An inclusive family event.',
  startDate: '2027-01-14T22:30:00.000Z',
  endDate: '2027-01-15T02:30:00.000Z',
  location: 'Addis Ababa',
  rsvpEnabled: true,
  status: 'PUBLISHED',
  languageCode: 'en',
};

describe('public event contract', () => {
  it('keeps only the public event allowlist', () => {
    const event = publicEventSchema.parse({
      ...publishedEvent,
      rsvps: [{ name: 'Private guest', email: 'private@example.org' }],
      createdBy: 'administrator-id',
    });

    expect(event).not.toHaveProperty('rsvps');
    expect(event).not.toHaveProperty('createdBy');
  });

  it('rejects drafts and invalid date ranges', () => {
    expect(() => publicEventSchema.parse({ ...publishedEvent, status: 'DRAFT' })).toThrow();
    expect(() =>
      publicEventSchema.parse({ ...publishedEvent, endDate: publishedEvent.startDate }),
    ).toThrow();
  });

  it('validates and normalizes RSVP input', () => {
    expect(
      rsvpInputSchema.parse({
        name: '  Family Guest ',
        email: 'guest@example.org',
        attendees: '2',
      }),
    ).toEqual({ name: 'Family Guest', email: 'guest@example.org', attendees: 2 });
    expect(() =>
      rsvpInputSchema.parse({ name: 'A', email: 'not-an-email', attendees: 21 }),
    ).toThrow();
  });
});
