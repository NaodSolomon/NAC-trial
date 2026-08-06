import { cookies } from 'next/headers';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { SkipLink } from '@/components/public/SkipLink';
import BackToTop from '@/components/common/BackToTop';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { languageCookieName, normalizeLanguage } from '@/lib/i18n';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialLanguage = normalizeLanguage(cookieStore.get(languageCookieName)?.value) ?? 'en';

  return (
    <LanguageProvider initialLanguage={initialLanguage}>
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
