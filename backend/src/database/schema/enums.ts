import { pgEnum } from 'drizzle-orm/pg-core';

export const adminRoleEnum = pgEnum('admin_role', [
  'SUPER_ADMIN',
  'CONTENT_EDITOR',
  'FINANCE_VIEWER',
]);

export const contentStatusEnum = pgEnum('content_status', ['DRAFT', 'SCHEDULED', 'PUBLISHED']);

export const languageCodeEnum = pgEnum('language_code', ['en', 'am']);

export const mediaTypeEnum = pgEnum('media_type', ['IMAGE', 'VIDEO', 'DOCUMENT']);

export const volunteerApplicationStatusEnum = pgEnum('volunteer_application_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

export const testimonialStatusEnum = pgEnum('testimonial_status', ['DRAFT', 'PUBLISHED']);

export const donationStatusEnum = pgEnum('donation_status', [
  'INITIATED',
  'PENDING',
  'CONFIRMED',
  'FAILED',
  'CANCELLED',
]);
export const donationCurrencyEnum = pgEnum('donation_currency', ['USD', 'ETB']);
export const donationGatewayEnum = pgEnum('donation_gateway', [
  'SIMULATED',
  'PAYPAL',
  'TELEBIRR',
  'CBE',
]);
export const outboxStatusEnum = pgEnum('outbox_status', [
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
]);

export const eventStatusEnum = pgEnum('event_status', ['DRAFT', 'PUBLISHED']);
export const eventRsvpStatusEnum = pgEnum('event_rsvp_status', ['CONFIRMED', 'CANCELLED']);

export const analyticsEventTypeEnum = pgEnum('analytics_event_type', [
  'page_view',
  'click',
  'submit',
]);
export const analyticsDeviceTypeEnum = pgEnum('analytics_device_type', [
  'mobile',
  'desktop',
  'tablet',
  'unknown',
]);
