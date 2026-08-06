import { describe, expect, it } from 'vitest';
import { publishedCmsPageSchema } from './cms.schemas';
import { sanitizeCmsText } from './sanitize-cms';

describe('CMS public rendering boundary', () => {
  it('removes markup and blocked element contents before React renders text', () => {
    expect(
      sanitizeCmsText(
        '<p>Safe introduction</p><script>window.location=\"https://evil.example\"</script><strong>More</strong>',
      ),
    ).toBe('Safe introduction More');
  });

  it('rejects a draft even if a malformed public endpoint returned it', () => {
    expect(() =>
      publishedCmsPageSchema.parse({
        id: '00000000-0000-4000-8000-000000000101',
        slug: 'about',
        languageCode: 'en',
        title: 'Private draft',
        content: 'Do not display',
        status: 'DRAFT',
      }),
    ).toThrow();
  });
});
