import type { Language } from './config';

const absoluteUrlPattern = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

export function localizedHref(href: string, language: Language): string {
  if (!href || href.startsWith('#') || absoluteUrlPattern.test(href)) return href;

  const [pathAndQuery, hash] = href.split('#', 2);
  const [pathname, query] = pathAndQuery.split('?', 2);
  const parameters = new URLSearchParams(query);
  parameters.set('lang', language);
  const queryString = parameters.toString();
  return `${pathname || '/'}${queryString ? `?${queryString}` : ''}${hash ? `#${hash}` : ''}`;
}
