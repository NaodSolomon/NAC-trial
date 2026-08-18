import { describe, expect, it } from 'vitest';
import { cmsEditorSchema } from './admin-cms.schemas';

function editor(overrides: Record<string, unknown> = {}) {
  return {
    slug: 'family-support',
    languageCode: 'en',
    title: 'Family support',
    content: 'Guidance for families.',
    translationKey: '',
    contentType: 'generic',
    homepage: {
      heroHeading: '',
      heroBody: '',
      primaryLabel: '',
      primaryHref: '',
      servicesHeading: '',
      services: [],
      locationHeading: '',
      locationBody: '',
      mapEmbedUrl: '',
      ctaHeading: '',
      ctaBody: '',
      ctaLabel: '',
      ctaHref: '',
    },
    about: {
      contentApproved: false,
      missionHeading: '',
      missionBody: '',
      historyHeading: '',
      historyBody: '',
      services: [],
    },
    volunteerRoles: [],
    teamMembers: [],
    teamContentApproved: false,
    ...overrides,
  };
}

function messagesFor(value: Record<string, unknown>, path: string) {
  const result = cmsEditorSchema.safeParse(value);
  if (result.success) return [];
  return result.error.issues
    .filter((issue) => issue.path.join('.') === path)
    .map((issue) => issue.message);
}

describe('cmsEditorSchema', () => {
  it('accepts a minimal generic page', () => {
    expect(cmsEditorSchema.safeParse(editor()).success).toBe(true);
  });

  it('explains the slug rule instead of echoing the pattern', () => {
    expect(messagesFor(editor({ slug: 'Family Support' }), 'slug')).toEqual([
      'Use lowercase letters, numbers and single hyphens, for example family-support.',
    ]);
  });

  it.each([
    ['leading hyphen', '-family'],
    ['trailing hyphen', 'family-'],
    ['double hyphen', 'family--support'],
    ['underscore', 'family_support'],
  ])('rejects a slug with a %s', (_label, slug) => {
    expect(cmsEditorSchema.safeParse(editor({ slug })).success).toBe(false);
  });

  it('treats a blank translation key as absent but rejects a malformed one', () => {
    expect(cmsEditorSchema.safeParse(editor({ translationKey: '' })).success).toBe(true);
    // A union would report only "Invalid input" here, which is why this is a refinement.
    expect(messagesFor(editor({ translationKey: 'not-a-uuid' }), 'translationKey')).toEqual([
      'Enter a valid UUID, or leave this blank to generate one.',
    ]);
  });

  describe('homepage composition', () => {
    const homepageEditor = (homepage: Record<string, unknown>) =>
      editor({ contentType: 'homepage', homepage: { ...editor().homepage, ...homepage } });

    it('reports each missing part against its own field', () => {
      const result = cmsEditorSchema.safeParse(homepageEditor({}));
      expect(result.success).toBe(false);
      if (result.success) return;
      const paths = result.error.issues.map((issue) => issue.path.join('.'));
      expect(paths).toContain('homepage.heroHeading');
      expect(paths).toContain('homepage.servicesHeading');
      expect(paths).toContain('homepage.services');
      expect(paths).toContain('homepage.ctaLabel');
    });

    it.each([
      ['plain http', 'http://www.google.com/maps/embed?pb=1'],
      ['a lookalike host', 'https://google.com.evil.example/maps'],
      ['an unrelated host', 'https://maps.example.com/embed'],
      ['empty', ''],
    ])('rejects a map embed URL that is %s', (_label, mapEmbedUrl) => {
      expect(messagesFor(homepageEditor({ mapEmbedUrl }), 'homepage.mapEmbedUrl')).toEqual([
        'Use an approved HTTPS Google Maps embed URL.',
      ]);
    });

    it.each(['https://www.google.com/maps/embed?pb=1', 'https://google.com/maps/embed?pb=1'])(
      'accepts the approved Google host %s',
      (mapEmbedUrl) => {
        expect(messagesFor(homepageEditor({ mapEmbedUrl }), 'homepage.mapEmbedUrl')).toEqual([]);
      },
    );

    it('passes once every required part is present', () => {
      const complete = homepageEditor({
        heroHeading: 'Welcome families',
        servicesHeading: 'Our services',
        services: [{ title: 'Family support', body: 'Guidance for families.' }],
        locationHeading: 'Visit the centre',
        mapEmbedUrl: 'https://www.google.com/maps/embed?pb=1',
        ctaHeading: 'Support our work',
        ctaLabel: 'Donate',
        ctaHref: '/donate',
      });
      expect(cmsEditorSchema.safeParse(complete).success).toBe(true);
    });
  });

  it('only enforces structured rules for the selected content type', () => {
    // The homepage block stays empty, but a generic page must not be judged on it.
    expect(cmsEditorSchema.safeParse(editor({ contentType: 'generic' })).success).toBe(true);
    expect(cmsEditorSchema.safeParse(editor({ contentType: 'homepage' })).success).toBe(false);
  });

  it.each([
    ['volunteer', 'volunteerRoles', 'Add at least one structured volunteer role.'],
    ['team', 'teamMembers', 'Add at least one approved team biography.'],
  ])('requires at least one entry for a %s page', (contentType, path, message) => {
    expect(messagesFor(editor({ contentType }), path)).toEqual([message]);
  });

  it('requires mission, history and services for an about page', () => {
    const paths = messagesFor(editor({ contentType: 'about' }), 'about.missionBody');
    expect(paths).toEqual(['Mission heading and content are required.']);
    expect(messagesFor(editor({ contentType: 'about' }), 'about.services')).toEqual([
      'Add at least one service.',
    ]);
  });
});
