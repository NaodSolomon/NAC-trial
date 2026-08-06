import { describe, expect, it } from 'vitest';
import { blogImage, serializeJsonLd } from './blog.utils';

describe('blog presentation safeguards', () => {
  it('escapes markup boundaries in structured data', () => {
    expect(serializeJsonLd({ title: '</script><script>alert(1)</script>' })).not.toContain(
      '</script>',
    );
  });

  it('does not render unapproved remote images', () => {
    expect(blogImage('https://untrusted.example/image.jpg', 1)).toBe('/images/blog_2.jpg');
  });
});
