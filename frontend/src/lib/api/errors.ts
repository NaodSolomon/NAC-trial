export type ApiErrorKind =
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'CONTRACT'
  | 'UNKNOWN';

export interface ApiErrorEnvelope {
  success: false;
  statusCode: number;
  message: string | string[];
  error?: string;
  path?: string;
  timestamp?: string;
}

interface ApiRequestErrorOptions {
  kind: ApiErrorKind;
  status: number;
  message: string;
  details?: string[];
  cause?: unknown;
}

export class ApiRequestError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly details: string[];

  constructor({ kind, status, message, details = [], cause }: ApiRequestErrorOptions) {
    super(message, { cause });
    this.name = 'ApiRequestError';
    this.kind = kind;
    this.status = status;
    this.details = details;
  }
}

const statusMessages: Record<number, { kind: ApiErrorKind; message: string }> = {
  400: {
    kind: 'VALIDATION',
    message: 'Please check the highlighted information and try again.',
  },
  401: {
    kind: 'AUTHENTICATION',
    message: 'Your session has expired. Please sign in again.',
  },
  403: {
    kind: 'AUTHORIZATION',
    message: 'You do not have permission to perform this action.',
  },
  404: { kind: 'NOT_FOUND', message: 'The requested information could not be found.' },
  409: {
    kind: 'CONFLICT',
    message: 'This request conflicts with the current state. Refresh and try again.',
  },
  429: {
    kind: 'RATE_LIMITED',
    message: 'Too many requests were sent. Please wait a moment and try again.',
  },
  503: {
    kind: 'UNAVAILABLE',
    message: 'The service is temporarily unavailable. Please try again shortly.',
  },
};

export function apiErrorFromResponse(status: number, payload: unknown): ApiRequestError {
  const envelope = isApiErrorEnvelope(payload) ? payload : undefined;
  const mapped =
    statusMessages[status] ??
    (status >= 500
      ? {
          kind: 'UNAVAILABLE' as const,
          message: 'The service is temporarily unavailable. Please try again shortly.',
        }
      : { kind: 'UNKNOWN' as const, message: 'The request could not be completed.' });

  return new ApiRequestError({
    kind: mapped.kind,
    status,
    message: mapped.message,
    details: normalizeMessages(envelope?.message),
  });
}

export function getApiErrorMessage(error: unknown): string {
  return error instanceof ApiRequestError
    ? error.message
    : 'Something went wrong. Please try again.';
}

export function getApiErrorMessageWithDetails(error: unknown): string {
  if (error instanceof ApiRequestError && error.details.length) {
    return error.details.join(' ');
  }
  return getApiErrorMessage(error);
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

function isApiErrorEnvelope(payload: unknown): payload is ApiErrorEnvelope {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Partial<ApiErrorEnvelope>;
  return (
    candidate.success === false &&
    typeof candidate.statusCode === 'number' &&
    (typeof candidate.message === 'string' || Array.isArray(candidate.message))
  );
}

function normalizeMessages(message: string | string[] | undefined): string[] {
  if (!message) return [];
  return (Array.isArray(message) ? message : [message]).filter(
    (entry): entry is string => typeof entry === 'string',
  );
}
