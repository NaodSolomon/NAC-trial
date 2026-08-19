import { describe, expect, it } from 'vitest';
import { eventEditorSchema } from './event-admin.schemas';

const event = {
  slug: 'family-day',
  title: 'Family day',
  description: 'A welcoming family event.',
  startDate: '2030-01-01T10:00',
  endDate: '2030-01-01T12:00',
  location: 'Addis Ababa',
  imageUrl: '',
  rsvpEnabled: true,
  status: 'DRAFT' as const,
  languageCode: 'en' as const,
};
describe('eventEditorSchema', () => {
  it('requires an end date after the start date', () => {
    expect(eventEditorSchema.safeParse(event).success).toBe(true);
    expect(eventEditorSchema.safeParse({ ...event, endDate: '2030-01-01T09:00' }).success).toBe(
      false,
    );
  });
});
