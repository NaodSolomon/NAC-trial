import { BadRequestException } from '@nestjs/common';
import { MediaFilePolicyService } from './media-file-policy.service';

describe('MediaFilePolicyService', () => {
  const service = new MediaFilePolicyService();

  it('classifies a file only after its signature matches its MIME type', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    expect(service.validate('image/png', png)).toMatchObject({
      type: 'IMAGE',
      extension: 'png',
    });
  });

  it('rejects executable content disguised as an image', () => {
    expect(() => service.validate('image/png', Buffer.from('MZ executable'))).toThrow(
      BadRequestException,
    );
  });

  it('rejects unapproved MIME types', () => {
    expect(() => service.validate('image/svg+xml', Buffer.from('<svg></svg>'))).toThrow(
      BadRequestException,
    );
  });
});
