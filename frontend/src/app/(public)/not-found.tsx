'use client';

import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';

export default function PublicNotFound() {
  const { href, t } = useLanguage();
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <p
        aria-hidden="true"
        className="text-primary font-serif text-8xl leading-none font-bold sm:text-9xl"
      >
        404
      </p>
      <h1 className="mt-5 text-3xl">{t('notFoundTitle')}</h1>
      <p className="text-foreground mt-3">{t('notFoundDescription')}</p>
      <Link
        href={href('/')}
        className="bg-primary mt-7 flex min-h-11 items-center rounded px-6 font-semibold text-white"
      >
        {t('backHome')}
      </Link>
    </section>
  );
}
