import { BadRequestException, Injectable } from '@nestjs/common';

export type AllowedMediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

interface FilePolicy {
  type: AllowedMediaType;
  extension: string;
  signature: (buffer: Buffer) => boolean;
}

const startsWith = (bytes: number[]) => (buffer: Buffer) =>
  buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte);

const policies: Record<string, FilePolicy> = {
  'image/jpeg': {
    type: 'IMAGE',
    extension: 'jpg',
    signature: startsWith([0xff, 0xd8, 0xff]),
  },
  'image/png': {
    type: 'IMAGE',
    extension: 'png',
    signature: startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  'image/gif': {
    type: 'IMAGE',
    extension: 'gif',
    signature: (buffer) =>
      buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
      buffer.subarray(0, 6).toString('ascii') === 'GIF89a',
  },
  'image/webp': {
    type: 'IMAGE',
    extension: 'webp',
    signature: (buffer) =>
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  'video/mp4': {
    type: 'VIDEO',
    extension: 'mp4',
    signature: (buffer) => buffer.subarray(4, 8).toString('ascii') === 'ftyp',
  },
  'video/webm': {
    type: 'VIDEO',
    extension: 'webm',
    signature: startsWith([0x1a, 0x45, 0xdf, 0xa3]),
  },
  'application/pdf': {
    type: 'DOCUMENT',
    extension: 'pdf',
    signature: (buffer) => buffer.subarray(0, 5).toString('ascii') === '%PDF-',
  },
};

@Injectable()
export class MediaFilePolicyService {
  validate(mimeType: string, buffer: Buffer): FilePolicy {
    const policy = policies[mimeType];

    if (!policy) {
      throw new BadRequestException(
        'Unsupported file type. Allowed types: JPEG, PNG, GIF, WebP, MP4, WebM, and PDF',
      );
    }
    if (!buffer.length || !policy.signature(buffer)) {
      throw new BadRequestException('File content does not match its declared MIME type');
    }

    return policy;
  }
}
