'use client';

import { useLanguage } from '@/hooks/use-language';

export function SkipLink() {
  const { t } = useLanguage();

  return (
    <a
      href="#main-content"
      className="skip-link text-text-dark fixed top-4 left-4 z-[100] -translate-y-24 rounded bg-white px-4 py-3 font-semibold shadow-lg focus:translate-y-0"
    >
      {t('skipToContent')}
    </a>
  );
}
