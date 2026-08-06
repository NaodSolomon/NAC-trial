import { ApiRequestError } from '@/lib/api/errors';

export function authenticationErrorMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return 'Authentication is temporarily unavailable. Please try again.';
  }
  if (error.status === 401) return 'The email address or password is incorrect.';
  if (error.status === 429) {
    return error.details.some((message) => /login attempts|locked/i.test(message))
      ? 'This account is temporarily locked after repeated failed attempts. Please try again later.'
      : 'Too many attempts were made. Please wait before trying again.';
  }
  if (error.status === 503 || error.kind === 'NETWORK' || error.kind === 'TIMEOUT') {
    return 'Authentication is temporarily unavailable. Please try again shortly.';
  }
  return error.details[0] ?? error.message;
}

export function recoveryErrorMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return 'Password recovery is temporarily unavailable. Please try again.';
  }
  if (error.status === 429) return 'Too many reset attempts were made. Please wait and try again.';
  if (error.status === 400) {
    return error.details[0] ?? 'This reset link is invalid, expired, or has already been used.';
  }
  return error.message;
}
