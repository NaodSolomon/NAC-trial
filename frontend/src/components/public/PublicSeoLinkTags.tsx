'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { normalizeLanguage } from '@/lib/i18n';
import { localizedUrl } from '@/lib/seo/site';

export function PublicSeoLinkTags() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const language = normalizeLanguage(searchParams.get('lang')) ?? 'en';
  const safePathname = pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/';
  return (
    <>
      <link rel="canonical" href={localizedUrl(safePathname, language)} />
      <link rel="alternate" hrefLang="en" href={localizedUrl(safePathname, 'en')} />
      <link rel="alternate" hrefLang="am" href={localizedUrl(safePathname, 'am')} />
      <link rel="alternate" hrefLang="x-default" href={localizedUrl(safePathname, 'en')} />
    </>
  );
}
