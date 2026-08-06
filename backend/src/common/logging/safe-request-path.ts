import { FastifyRequest } from 'fastify';

const REDACTED = '[REDACTED]';

export function safeRequestPath(request: FastifyRequest): string {
  const routeTemplate = request.routeOptions?.url?.split('?')[0];
  if (routeTemplate && !routeTemplate.includes('*')) return routeTemplate;
  return redactSensitivePath(request.url.split('?')[0]);
}

export function redactSensitivePath(path: string): string {
  const segments = path.split('/');
  const newsletterIndex = segments.findIndex(
    (segment) => decodedSegment(segment).toLowerCase() === 'newsletter',
  );
  if (newsletterIndex >= 0 && segments[newsletterIndex + 1]) {
    segments[newsletterIndex + 1] = REDACTED;
  }

  return segments
    .map((segment) => (decodedSegment(segment).includes('@') ? REDACTED : segment))
    .join('/');
}

function decodedSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
