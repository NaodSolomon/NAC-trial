import { afterEach, describe, expect, it } from 'vitest';
import { eventDateKey, formatEventDate, formatEventTimeRange } from './event.utils';

const originalTimezone = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTimezone;
});

describe('event timezone presentation', () => {
  it('uses Addis Ababa for dates near a UTC day boundary', () => {
    expect(eventDateKey('2027-01-14T22:30:00.000Z')).toBe('2027-01-15');
    expect(formatEventDate('2027-01-14T22:30:00.000Z', 'en')).toContain('January 15, 2027');
  });

  it('does not change when the host or browser timezone changes', () => {
    const start = '2027-01-14T22:30:00.000Z';
    const end = '2027-01-15T02:30:00.000Z';
    process.env.TZ = 'Pacific/Honolulu';
    const honolulu = formatEventTimeRange(start, end, 'en');
    process.env.TZ = 'Asia/Tokyo';
    const tokyo = formatEventTimeRange(start, end, 'en');
    expect(tokyo).toBe(honolulu);
  });
});
