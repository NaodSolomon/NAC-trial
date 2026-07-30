import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCmsPageDto } from './create-cms-page.dto';

function page(metadata: unknown): CreateCmsPageDto {
  return plainToInstance(CreateCmsPageDto, {
    slug: 'home',
    languageCode: 'en',
    title: 'Homepage',
    content: 'Homepage content',
    metadata,
  });
}

async function errorsFor(metadata: unknown) {
  return validate(page(metadata), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('CMS composition metadata validation', () => {
  it('accepts typed homepage sections and nested actions', async () => {
    await expect(
      errorsFor({
        sections: [
          {
            type: 'hero',
            heading: 'Support starts here',
            body: 'Welcome.',
            primaryAction: { label: 'Contact us', href: '/contact' },
          },
          {
            type: 'services',
            heading: 'Services',
            items: [{ title: 'Family guidance', body: 'Practical support.' }],
          },
          {
            type: 'callToAction',
            heading: 'Talk with our team',
            action: { label: 'Get in touch', href: '/contact' },
          },
        ],
      }),
    ).resolves.toHaveLength(0);
  });

  it('accepts bounded FAQ question and answer items', async () => {
    await expect(
      errorsFor({
        items: [{ question: 'How can I get help?', answer: 'Contact our team.' }],
      }),
    ).resolves.toHaveLength(0);
  });

  it.each([
    { sections: [{ type: 'hero', heading: 42 }] },
    { sections: [{ type: 'services', heading: 'Services', items: [] }] },
    { sections: [{ type: 'unknown', heading: 'Unknown' }] },
    { items: [{ question: 'Missing answer' }] },
    { items: [{ question: 'Valid?', answer: 'Yes', trackingCode: 'not-allowed' }] },
  ])('rejects malformed or unknown nested metadata %#', async (metadata) => {
    await expect(errorsFor(metadata)).resolves.not.toHaveLength(0);
  });
});
