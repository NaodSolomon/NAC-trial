import { OpenAPIObject } from '@nestjs/swagger';
import {
  OperationObject,
  SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const errorRef = { $ref: '#/components/schemas/ApiErrorResponseDto' };
const HTTP_METHODS = ['get', 'post', 'patch', 'put', 'delete'] as const;

export function completeOpenApiContract(document: OpenAPIObject): OpenAPIObject {
  document.components ??= {};
  document.components.schemas ??= {};
  document.components.schemas.PaginationMetaDto = {
    type: 'object',
    required: ['total', 'page', 'limit', 'totalPages'],
    properties: {
      total: { type: 'integer' },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      totalPages: { type: 'integer', minimum: 0 },
    },
  };
  document.components.schemas.PaginatedResponse = {
    allOf: [
      successSchema(200),
      {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            required: ['data', 'meta'],
            properties: {
              data: { type: 'array', items: { type: 'object', additionalProperties: true } },
              meta: { $ref: '#/components/schemas/PaginationMetaDto' },
            },
          },
        },
      },
    ],
  };

  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem?.[method] as OperationObject | undefined;
      if (!operation) continue;
      operation.tags ??= [tagFor(path)];
      operation.summary ??= summaryFor(method, path);
      operation.responses ??= {};
      // OpenAPI security is inherited unless explicitly overridden. Declaring an
      // empty requirement prevents public routes from appearing authenticated.
      operation.security ??= [];

      // Swagger has already read Nest's @HttpCode and @ApiResponse metadata.
      // Enrich those declared success responses without guessing from the verb.
      for (const [statusCode, successResponse] of successResponses(operation)) {
        if (statusCode === '204' || '$ref' in successResponse || successResponse.content) continue;
        successResponse.content = {
          'application/json': {
            schema: isPaginated(operation)
              ? { $ref: '#/components/schemas/PaginatedResponse' }
              : successSchema(Number(statusCode)),
          },
        };
      }
      // The global throttler can reject every route, so this is a known global response.
      // Other errors must be declared by controller metadata when the route can emit them.
      operation.responses['429'] ??= errorResponse('Rate limit exceeded');

      if (path.startsWith('/api/v1/admin/') || protectedAuthPath(path)) {
        operation.security = [{ 'admin-jwt': [] }];
        operation.responses['401'] ??= errorResponse('Authentication required');
        operation.responses['403'] ??= errorResponse('Insufficient role');
      }
      if (path.startsWith('/api/v1/internal/')) {
        operation.security = [{ 'internal-api-key': [] }];
        operation.responses['401'] ??= errorResponse('Internal API key required');
      }
    }
  }
  return document;
}

export function validateOpenApiContract(document: OpenAPIObject): string[] {
  const errors: string[] = [];
  if (!/^3\./.test(document.openapi)) errors.push('openapi must declare version 3.x');
  if (!document.info?.title || !document.info?.version) errors.push('info title/version required');
  if (!document.info?.license?.name || !document.info.license.url) {
    errors.push('info license name/url required');
  }
  if (!document.servers?.length) errors.push('at least one server is required');
  const schemas = document.components?.schemas ?? {};

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    if (!path.startsWith('/')) errors.push(`path must start with /: ${path}`);
    for (const method of HTTP_METHODS) {
      const operation = pathItem?.[method] as OperationObject | undefined;
      if (!operation) continue;
      const location = `${method.toUpperCase()} ${path}`;
      if (!operation.tags?.length) errors.push(`${location} requires a tag`);
      if (!operation.summary) errors.push(`${location} requires a summary`);
      if (!operation.security) errors.push(`${location} requires an explicit security declaration`);
      if (!Object.keys(operation.responses ?? {}).length) {
        errors.push(`${location} requires responses`);
      }
      if (!successResponses(operation).length) {
        errors.push(`${location} requires an explicit 2xx response`);
      }
      const declaredPathParameters = new Set(
        [...(pathItem?.parameters ?? []), ...(operation.parameters ?? [])]
          .filter(
            (parameter): parameter is Exclude<typeof parameter, { $ref: string }> =>
              !('$ref' in parameter) && parameter.in === 'path',
          )
          .map((parameter) => parameter.name),
      );
      for (const parameterName of pathParameterNames(path)) {
        if (!declaredPathParameters.has(parameterName)) {
          errors.push(`${location} must declare path parameter ${parameterName}`);
        }
      }
      visitRefs(operation, (ref) => {
        const name = ref.replace('#/components/schemas/', '');
        if (ref.startsWith('#/components/schemas/') && !schemas[name]) {
          errors.push(`${location} has unresolved schema reference ${ref}`);
        }
      });
    }
  }
  return errors;
}

function pathParameterNames(path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
}

function successSchema(statusCode: number): SchemaObject {
  return {
    type: 'object',
    required: ['success', 'data', 'statusCode', 'timestamp'],
    properties: {
      success: { type: 'boolean', enum: [true] },
      data: {},
      statusCode: { type: 'integer', example: statusCode },
      timestamp: { type: 'string', format: 'date-time' },
    },
  };
}

function successResponses(
  operation: OperationObject,
): Array<[string, Exclude<OperationObject['responses'][string], undefined>]> {
  return Object.entries(operation.responses ?? {}).filter(([statusCode]) =>
    /^2\d\d$/.test(statusCode),
  );
}

function errorResponse(description: string) {
  return {
    description,
    content: { 'application/json': { schema: errorRef } },
  };
}

function tagFor(path: string): string {
  const segments = path.split('/').filter(Boolean);
  const scope = segments[2] === 'admin' || segments[2] === 'public' ? segments[2] : 'API';
  const resource = segments[3] ?? segments[2] ?? 'system';
  return `${scope === 'API' ? '' : `${scope[0].toUpperCase()}${scope.slice(1)} `}${resource}`;
}

function summaryFor(method: string, path: string): string {
  const action = {
    get: 'Get',
    post: 'Create or execute',
    patch: 'Update',
    put: 'Replace',
    delete: 'Delete',
  }[method];
  return `${action} ${path.replace('/api/v1/', '').replaceAll(/[{}]/g, '')}`;
}

function protectedAuthPath(path: string): boolean {
  return path === '/api/v1/auth/me' || path === '/api/v1/auth/logout';
}

function isPaginated(operation: OperationObject): boolean {
  const queryNames = new Set(
    (operation.parameters ?? [])
      .filter(
        (parameter): parameter is Exclude<typeof parameter, { $ref: string }> =>
          !('$ref' in parameter) && parameter.in === 'query',
      )
      .map((parameter) => parameter.name),
  );
  return queryNames.has('page') && queryNames.has('limit');
}

function visitRefs(value: unknown, visitor: (ref: string) => void): void {
  if (Array.isArray(value)) return value.forEach((item) => visitRefs(item, visitor));
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (key === '$ref' && typeof nested === 'string') visitor(nested);
    else visitRefs(nested, visitor);
  }
}
