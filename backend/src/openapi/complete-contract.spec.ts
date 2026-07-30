import { OpenAPIObject } from '@nestjs/swagger';
import { completeOpenApiContract, validateOpenApiContract } from './complete-contract';

function documentWithResponses(responses: Record<string, { description: string }>): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0' },
    servers: [{ url: '/' }],
    paths: {
      '/api/v1/auth/refresh': {
        post: {
          tags: ['Authentication'],
          summary: 'Refresh tokens',
          responses,
        },
      },
    },
  } as OpenAPIObject;
}

describe('completeOpenApiContract', () => {
  it('preserves the success status generated from Nest route metadata', () => {
    const document = completeOpenApiContract(
      documentWithResponses({
        '200': { description: 'Token pair issued' },
        '401': { description: 'Refresh token rejected' },
      }),
    );
    const responses = document.paths['/api/v1/auth/refresh']?.post?.responses;

    expect(responses?.['200']).toBeDefined();
    expect(responses?.['201']).toBeUndefined();
    expect(responses?.['401']).toBeDefined();
    expect(responses?.['400']).toBeUndefined();
    expect(responses?.['404']).toBeUndefined();
    expect(document.paths['/api/v1/auth/refresh']?.post?.security).toEqual([]);
  });

  it('reports an operation that has no explicit success response', () => {
    const document = documentWithResponses({
      '401': { description: 'Refresh token rejected' },
    });

    expect(validateOpenApiContract(document)).toContain(
      'POST /api/v1/auth/refresh requires an explicit 2xx response',
    );
  });
});
