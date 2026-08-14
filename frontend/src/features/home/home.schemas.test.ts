import { describe, expect, it } from 'vitest';
import { homeCompositionSchema } from './home.schemas';

const validComposition = {
  title: 'Nehemiah Autism Center',
  body: 'Family-centered support.',
  sections: [
    {
      type: 'hero',
      heading: 'Every child deserves support',
      body: 'A welcoming community in Ethiopia.',
      primaryAction: { label: 'Learn more', href: '/about' },
    },
    {
      type: 'services',
      heading: 'How we help',
      items: [{ title: 'Family guidance', body: 'Practical support.' }],
    },
    {
      type: 'callToAction',
      heading: 'Talk to our team',
      body: 'We are ready to listen.',
      action: { label: 'Contact us', href: '/contact' },
    },
    {
      type: 'location',
      heading: 'Find us',
      body: 'Load the map when needed.',
      mapEmbedUrl: 'https://www.google.com/maps?q=Addis+Ababa&output=embed',
    },
  ],
  seo: { title: 'Autism support in Ethiopia', description: null, imageUrl: null },
};

describe('homeCompositionSchema', () => {
  it('accepts the typed homepage section contract', () => {
    expect(homeCompositionSchema.parse(validComposition).sections).toHaveLength(4);
  });

  it.each(['javascript:alert(1)', '//untrusted.example/path', 'http://untrusted.example'])(
    'rejects unsafe CMS action URL %s',
    (href) => {
      const input = structuredClone(validComposition);
      const hero = input.sections[0];
      if (!hero || hero.type !== 'hero' || !hero.primaryAction) {
        throw new Error('Hero fixture is missing.');
      }
      hero.primaryAction.href = href;
      expect(() => homeCompositionSchema.parse(input)).toThrow();
    },
  );

  it('rejects a non-Google or non-HTTPS homepage map', () => {
    const input = structuredClone(validComposition);
    const location = input.sections.find((section) => section.type === 'location');
    if (!location || location.type !== 'location') throw new Error('Location fixture is missing.');
    location.mapEmbedUrl = 'https://attacker.test/map';
    expect(() => homeCompositionSchema.parse(input)).toThrow();
  });
});
