import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { SkipLink } from '@/components/public/SkipLink';
import BackToTop from '@/components/common/BackToTop';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { languageCookieName, normalizeLanguage } from '@/lib/i18n';
import { PublicRouteAnalytics } from '@/features/analytics/PublicRouteAnalytics';
import { serializeJsonLd } from '@/lib/seo/json-ld';
import { getSiteUrl, siteName } from '@/lib/seo/site';
import { loadPublicSettings } from '@/features/settings/public-settings.server';
import { PublicSeoLinkTags } from '@/components/public/PublicSeoLinkTags';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialLanguage = normalizeLanguage(cookieStore.get(languageCookieName)?.value) ?? 'en';
  const settings = await loadPublicSettings();
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': new URL('/#organization', getSiteUrl()).toString(),
    name: settings?.siteName ?? siteName,
    url: getSiteUrl().toString(),
    // Structured data claims only what the organization has actually configured.
    ...(settings?.address && {
      address: { '@type': 'PostalAddress', streetAddress: settings.address },
    }),
  };

  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd) }}
      />
      <PublicRouteAnalytics />
      <Suspense fallback={null}>
        <PublicSeoLinkTags />
      </Suspense>
      <SkipLink />
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="min-h-[50vh] outline-none">
        {children}
      </main>
      <PublicFooter />
      <BackToTop />
    </LanguageProvider>
  );
}
