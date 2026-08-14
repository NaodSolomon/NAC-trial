import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  adminRoleEnum,
  admins,
  authSessions,
  cmsPages,
  contactSubmissions,
  languageCodeEnum,
  mediaAssets,
  mediaTranslations,
  newsletterSubscribers,
  testimonialStatusEnum,
  testimonials,
  volunteerApplicationStatusEnum,
  volunteerApplications,
  eventStatusEnum,
  events,
  eventRsvps,
  galleryItems,
  analyticsEvents,
  analyticsEventTypeEnum,
  resourceDownloadLogs,
  storageDeletionOutbox,
} from '.';

describe('database schema foundation', () => {
  it('enforces the agreed administrator roles and languages', () => {
    expect(adminRoleEnum.enumValues).toEqual(['SUPER_ADMIN', 'CONTENT_EDITOR', 'FINANCE_VIEWER']);
    expect(languageCodeEnum.enumValues).toEqual(['en', 'am']);
  });

  it('stores passwords and refresh tokens only as hashes', () => {
    const adminColumns = getTableConfig(admins).columns.map((column) => column.name);
    const sessionColumns = getTableConfig(authSessions).columns.map((column) => column.name);

    expect(adminColumns).toContain('password_hash');
    expect(adminColumns).not.toContain('password');
    expect(sessionColumns).toContain('token_hash');
    expect(sessionColumns).not.toContain('refresh_token');
  });

  it('models multilingual CMS and media content explicitly', () => {
    const cmsColumns = getTableConfig(cmsPages).columns.map((column) => column.name);
    const mediaForeignKeys = getTableConfig(mediaTranslations).foreignKeys;

    expect(cmsColumns).toEqual(
      expect.arrayContaining(['translation_key', 'slug', 'language_code']),
    );
    expect(mediaForeignKeys).toHaveLength(1);
    expect(getTableConfig(mediaAssets).indexes).not.toHaveLength(0);
  });

  it('indexes contact submissions without storing network identifiers', () => {
    const config = getTableConfig(contactSubmissions);
    const columns = config.columns.map((column) => column.name);

    expect(columns).toEqual(expect.arrayContaining(['name', 'email', 'message', 'language_code']));
    expect(columns).not.toEqual(expect.arrayContaining(['ip_address', 'user_agent']));
    expect(config.indexes).toHaveLength(2);
  });

  it('enforces engagement moderation and subscriber uniqueness', () => {
    expect(volunteerApplicationStatusEnum.enumValues).toEqual(['PENDING', 'APPROVED', 'REJECTED']);
    expect(testimonialStatusEnum.enumValues).toEqual(['DRAFT', 'PUBLISHED']);
    expect(getTableConfig(volunteerApplications).indexes).toHaveLength(3);
    expect(getTableConfig(testimonials).foreignKeys).toHaveLength(1);
    expect(getTableConfig(newsletterSubscribers).indexes.some((index) => index.config.unique)).toBe(
      true,
    );
  });

  it('enforces event publication and RSVP ownership constraints', () => {
    expect(eventStatusEnum.enumValues).toEqual(['DRAFT', 'PUBLISHED']);
    expect(getTableConfig(events).foreignKeys).toHaveLength(1);
    expect(getTableConfig(events).indexes.filter((index) => index.config.unique)).toHaveLength(2);
    expect(getTableConfig(eventRsvps).foreignKeys).toHaveLength(1);
    expect(getTableConfig(eventRsvps).indexes.some((index) => index.config.unique)).toBe(true);
  });

  it('owns every gallery entry through a media asset and administrator', () => {
    const config = getTableConfig(galleryItems);
    expect(config.foreignKeys).toHaveLength(2);
    expect(config.indexes.some((index) => index.config.unique)).toBe(true);
  });

  it('stores bounded anonymous analytics without network identifiers', () => {
    const config = getTableConfig(analyticsEvents);
    const columns = config.columns.map((column) => column.name);
    expect(analyticsEventTypeEnum.enumValues).toEqual(['page_view', 'click', 'submit']);
    expect(columns).toEqual(
      expect.arrayContaining(['event_type', 'page_url', 'country', 'device_type', 'referrer']),
    );
    expect(columns).not.toEqual(
      expect.arrayContaining(['ip_address', 'visitor_id', 'cookie_id', 'user_agent']),
    );
    expect(config.indexes).toHaveLength(3);
  });

  it('stores bounded resource download locations without network identifiers', () => {
    const config = getTableConfig(resourceDownloadLogs);
    const columns = config.columns.map((column) => column.name);

    expect(columns).toEqual(expect.arrayContaining(['resource_id', 'country', 'downloaded_at']));
    expect(columns).not.toEqual(
      expect.arrayContaining(['ip_address', 'user_agent', 'city', 'region']),
    );
    expect(config.foreignKeys).toHaveLength(1);
    expect(config.checks).toHaveLength(1);
    expect(config.indexes).toHaveLength(3);
  });

  it('persists idempotent storage deletion jobs without database entity references', () => {
    const config = getTableConfig(storageDeletionOutbox);
    const columns = config.columns.map((column) => column.name);

    expect(columns).toEqual(
      expect.arrayContaining(['object_key', 'status', 'attempts', 'next_attempt_at', 'lock_token']),
    );
    expect(config.foreignKeys).toHaveLength(0);
    expect(config.indexes.some((index) => index.config.unique)).toBe(true);
  });
});
