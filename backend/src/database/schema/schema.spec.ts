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
});
