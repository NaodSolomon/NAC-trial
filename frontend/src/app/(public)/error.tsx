'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { href, t } = useLanguage();
  return (
    <section
      role="alert"
      className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center"
    >
      <AlertTriangle aria-hidden="true" className="text-destructive size-12" />
      <h1 className="mt-5 text-3xl">{t('errorTitle')}</h1>
      <p className="text-foreground mt-3">{t('errorDescription')}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-primary-dark min-h-11 rounded px-6 font-semibold text-white"
        >
          {t('retry')}
        </button>
        <Link
          href={href('/')}
          className="flex min-h-11 items-center rounded border px-6 font-semibold"
        >
          {t('backHome')}
        </Link>
      </div>
    </section>
  );
}
