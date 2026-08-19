import { CalendarClock } from 'lucide-react';
import { translate, type Language } from '@/lib/i18n';

export function HomePreparing({ language }: { language: Language }) {
  return (
    <section
      aria-labelledby="home-preparing-heading"
      className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center"
    >
      <CalendarClock aria-hidden="true" className="text-primary size-12" />
      <h1
        id="home-preparing-heading"
        className="text-heading mt-6 font-serif text-3xl font-semibold sm:text-4xl"
      >
        {translate(language, 'homePreparingTitle')}
      </h1>
      <p className="text-foreground mt-4 max-w-md leading-relaxed">
        {translate(language, 'homePreparingBody')}
      </p>
    </section>
  );
}
