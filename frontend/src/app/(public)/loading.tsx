'use client';

import { useLanguage } from '@/hooks/use-language';

export default function PublicLoading() {
  const { t } = useLanguage();

  return (
    <section
      aria-label={t('loading')}
      aria-busy="true"
      className="mx-auto min-h-[50vh] max-w-7xl animate-pulse px-4 py-12"
    >
      <span className="sr-only">{t('loading')}</span>
      <div className="bg-muted h-10 max-w-md rounded" />
      <div className="bg-muted mt-6 h-5 max-w-2xl rounded" />
      <div className="bg-muted mt-3 h-5 max-w-xl rounded" />
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="bg-muted h-52 rounded" />
        ))}
      </div>
    </section>
  );
}
