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
