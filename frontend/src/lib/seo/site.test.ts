import { afterEach, describe, expect, it } from 'vitest';
import { absoluteUrl, buildLocalizedMetadata, localizedUrl } from './site';

describe('public SEO metadata', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it('builds canonical and language-alternate URLs without unrelated query values', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://nehemiah.example/base?campaign=private';
    const metadata = buildLocalizedMetadata({
      pathname: '/about',
      language: 'am',
      title: 'About',
      description: '<p>Published description</p>',
    });
    expect(localizedUrl('/about?campaign=private', 'am')).toBe(
      'https://nehemiah.example/about?lang=am',
    );
    expect(metadata.description).toBe('Published description');
  });

  it('resolves relative media and strips query strings from localized paths', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://nehemiah.example';
    expect(absoluteUrl('/images/story.jpg')).toBe('https://nehemiah.example/images/story.jpg');
    expect(localizedUrl('/blog?draft=true', 'en')).toBe(
      'https://nehemiah.example/blog?lang=en',
    );
  });
});
