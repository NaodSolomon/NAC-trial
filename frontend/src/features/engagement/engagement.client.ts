import { browserApiClient } from '@/lib/api/browser-client';
import type { Language } from '@/lib/i18n';
import { submittedSchema, subscribedSchema } from './engagement.schemas';
import type {
  ContactFormValues,
  NewsletterFormValues,
  VolunteerFormValues,
} from './engagement.types';

export async function submitContact(values: ContactFormValues, signal?: AbortSignal) {
  const result = await browserApiClient.post<unknown>('/public/contact', values, { signal });
  return submittedSchema.parse(result);
}

export async function submitVolunteer(values: VolunteerFormValues, signal?: AbortSignal) {
  const result = await browserApiClient.post<unknown>('/public/volunteer/apply', values, {
    signal,
  });
  return submittedSchema.parse(result);
}

export async function subscribeNewsletter(values: NewsletterFormValues, signal?: AbortSignal) {
  const result = await browserApiClient.post<unknown>('/public/newsletter', values, { signal });
  return subscribedSchema.parse(result);
}

export function publicFormError(error: unknown, language: Language): string {
  const kind =
    error && typeof error === 'object' && 'kind' in error && typeof error.kind === 'string'
      ? error.kind
      : 'UNKNOWN';
  if (kind === 'RATE_LIMITED') {
    return language === 'am'
      ? 'ብዙ ጥያቄዎች ተልከዋል። እባክዎ ጥቂት ጊዜ ቆይተው እንደገና ይሞክሩ።'
      : 'Too many requests were sent. Please wait a moment before trying again.';
  }
  if (['UNAVAILABLE', 'NETWORK', 'TIMEOUT'].includes(kind)) {
    return language === 'am'
      ? 'አገልግሎቱ ለጊዜው አይገኝም። መረጃዎ አልተላከም፤ ቆይተው ይሞክሩ።'
      : 'The service is temporarily unavailable. Your information was not submitted; please try again later.';
  }
  return language === 'am'
    ? 'ጥያቄውን ማጠናቀቅ አልተቻለም። መረጃውን ያረጋግጡና እንደገና ይሞክሩ።'
    : 'We could not complete the request. Check the information and try again.';
}
