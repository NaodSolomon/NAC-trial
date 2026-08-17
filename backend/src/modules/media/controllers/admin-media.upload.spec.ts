import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { MediaService } from '../services/media.service';
import { AdminMediaController } from './admin-media.controller';

const actor: AdminPrincipal = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Editor',
  email: 'editor@example.org',
  role: 'CONTENT_EDITOR',
};

function filePart(name = 'photo.png') {
  return {
    type: 'file' as const,
    filename: name,
    mimetype: 'image/png',
    toBuffer: async () => Buffer.from('binary'),
  };
}

function fieldPart(fieldname: string, value: string) {
  return { type: 'field' as const, fieldname, value };
}

function requestWith(parts: unknown[], isMultipart = true): FastifyRequest {
  return {
    isMultipart: () => isMultipart,
    parts: () => {
      let index = 0;
      return {
        [Symbol.asyncIterator]() {
          return {
            next: async () => {
              if (index >= parts.length) return { done: true, value: undefined };
              const value = parts[index];
              index += 1;
              if (value instanceof Error) throw value;
              return { done: false, value };
            },
          };
        },
      };
    },
  } as unknown as FastifyRequest;
}

describe('AdminMediaController upload guards', () => {
  let service: jest.Mocked<MediaService>;
  let controller: AdminMediaController;

  beforeEach(() => {
    service = {
      upload: jest.fn().mockResolvedValue({ id: 'media-id' }),
      list: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<MediaService>;
    controller = new AdminMediaController(service);
  });

  it('refuses a request that is not multipart', async () => {
    await expect(controller.upload(requestWith([], false), actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuses a request carrying no file', async () => {
    await expect(
      controller.upload(requestWith([fieldPart('folder', 'pages')]), actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a second uploaded file', async () => {
    await expect(
      controller.upload(requestWith([filePart(), filePart('second.png')]), actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses an unexpected multipart field', async () => {
    await expect(
      controller.upload(requestWith([fieldPart('unexpected', 'x'), filePart()]), actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a duplicated multipart field', async () => {
    await expect(
      controller.upload(
        requestWith([fieldPart('folder', 'a'), fieldPart('folder', 'b'), filePart()]),
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('translates the fastify oversize signal into a payload-too-large response', async () => {
    const oversize = Object.assign(new Error('too large'), { code: 'FST_REQ_FILE_TOO_LARGE' });

    await expect(controller.upload(requestWith([oversize]), actor)).rejects.toBeInstanceOf(
      PayloadTooLargeException,
    );
  });

  it.each([
    ['a plain error', new Error('stream failure')],
    ['an unrelated code', Object.assign(new Error('other'), { code: 'FST_OTHER' })],
  ])('rethrows %s untouched', async (_label, error) => {
    await expect(controller.upload(requestWith([error]), actor)).rejects.not.toBeInstanceOf(
      PayloadTooLargeException,
    );
  });

  it('accepts one file with the allowed descriptive fields', async () => {
    await controller.upload(
      requestWith([
        fieldPart('languageCode', 'en'),
        fieldPart('altText', 'A welcoming classroom'),
        fieldPart('caption', 'Family session'),
        fieldPart('folder', 'pages'),
        filePart(),
      ]),
      actor,
    );

    expect(service.upload).toHaveBeenCalledTimes(1);
  });
});
