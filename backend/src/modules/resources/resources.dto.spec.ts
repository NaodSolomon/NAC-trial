import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateResourceDto } from './resources.dto';

function resource(overrides: Partial<CreateResourceDto> = {}): CreateResourceDto {
  return plainToInstance(CreateResourceDto, {
    title: 'Family guide',
    description: 'A guide for families.',
    fileUrl: 'http://localhost:9000/nehemiah-media/guides/family.pdf',
    fileName: 'family.pdf',
    mimeType: 'application/pdf',
    languageCode: 'en',
    ...overrides,
  });
}

describe('CreateResourceDto', () => {
  it('accepts a supported document under the configured MinIO public path', async () => {
    await expect(validate(resource())).resolves.toHaveLength(0);
  });

  it.each([
    'https://attacker.example/family.pdf',
    'http://localhost:9000/different-bucket/family.pdf',
    'javascript:alert(1)',
    'not-a-url',
  ])('rejects an unapproved resource URL: %s', async (fileUrl) => {
    const errors = await validate(resource({ fileUrl }));
    expect(errors.some((error) => error.property === 'fileUrl')).toBe(true);
  });

  it('rejects executable and unrecognized MIME types', async () => {
    const errors = await validate(
      resource({ mimeType: 'application/x-msdownload' as CreateResourceDto['mimeType'] }),
    );
    expect(errors.some((error) => error.property === 'mimeType')).toBe(true);
  });
});
