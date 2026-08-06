import Image from 'next/image';
import Link from 'next/link';
import { localizedHref, type Language } from '@/lib/i18n';
import type { HomeHeroSection } from '@/features/home/home.types';

export function HomeHero({ section, language }: { section: HomeHeroSection; language: Language }) {
  return (
    <section className="bg-text-dark relative isolate flex min-h-[34rem] items-center overflow-hidden sm:min-h-[40rem]">
      <Image
        src={section.imageUrl ?? '/images/home_1_slider_1.jpg'}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />
      <div className="relative mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <h1 className="text-4xl leading-tight font-semibold text-white sm:text-5xl lg:text-6xl">
            {section.heading}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/90 sm:text-xl">
            {section.body}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <HomeActionLink action={section.primaryAction} language={language} primary />
            {section.secondaryAction && (
              <HomeActionLink action={section.secondaryAction} language={language} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeActionLink({
  action,
  language,
  primary = false,
}: {
  action: HomeHeroSection['primaryAction'];
  language: Language;
  primary?: boolean;
}) {
  return (
    <Link
      href={localizedHref(action.href, language)}
      className={
        primary
          ? 'bg-primary hover:bg-primary-hover inline-flex min-h-12 items-center rounded px-7 font-semibold text-white'
          : 'hover:text-text-dark inline-flex min-h-12 items-center rounded border-2 border-white px-7 font-semibold text-white hover:bg-white'
      }
    >
      {action.label}
    </Link>
  );
}
