import Link from 'next/link';
import { localizedHref, type Language } from '@/lib/i18n';
import type { HomeCallToActionSection } from '@/features/home/home.types';

export function HomeCallToAction({
  section,
  language,
}: {
  section: HomeCallToActionSection;
  language: Language;
}) {
  return (
    <section className="bg-primary-dark py-16 text-white sm:py-20">
      <div className="mx-auto flex max-w-5xl flex-col items-center px-4 text-center">
        <h2 className="text-3xl font-semibold text-white sm:text-4xl">{section.heading}</h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/85">{section.body}</p>
        <Link
          href={localizedHref(section.action.href, language)}
          className="text-primary-dark hover:bg-secondary mt-7 inline-flex min-h-12 items-center rounded bg-white px-7 font-semibold"
        >
          {section.action.label}
        </Link>
      </div>
    </section>
  );
}
