import type { Metadata } from 'next';
import { loadPublicSettings } from '@/features/settings/public-settings.server';
import Link from 'next/link';
import { CalendarDays, List } from 'lucide-react';
import PageBanner from '@/components/common/PageBanner';
import {
  EventCalendar,
  EventsList,
  loadPublicEvents,
  parseEventTimeframe,
  parseEventView,
  type EventTimeframe,
  type EventView,
} from '@/features/events';
import { localizedHref, translate, type Language } from '@/lib/i18n';
import { resolveRequestLanguage } from '@/lib/i18n/server';

import { localizedPageMetadata } from '@/lib/seo/site.server';

interface EventsPageProps {
  searchParams: Promise<{ lang?: string; timeframe?: string; view?: string }>;
}

export async function generateMetadata({ searchParams }: EventsPageProps): Promise<Metadata> {
  const language = await resolveRequestLanguage((await searchParams).lang);
  return localizedPageMetadata({
    pathname: '/events',
    language,
    title: language === 'am' ? 'ዝግጅቶች' : 'Events',
    description:
      language === 'am'
        ? 'የነህምያ ኦቲዝም ማዕከል መጪ እና ያለፉ ዝግጅቶች።'
        : 'Upcoming and past events from Nehemiah Autism Center.',
  });
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const settings = await loadPublicSettings();
  const query = await searchParams;
  const language = await resolveRequestLanguage(query.lang);
  const timeframe = parseEventTimeframe(query.timeframe);
  const view = parseEventView(query.view);
  const page = await loadPublicEvents(language, timeframe);
  const title = language === 'am' ? 'ዝግጅቶች' : 'Our events';

  return (
    <>
      <PageBanner
        title={title}
        breadcrumbs={[
          { label: translate(language, 'home'), href: localizedHref('/', language) },
          { label: title },
        ]}
        backgroundImage={settings?.pageBanners.events ?? '/images/event_1.jpg'}
      />
      <section className="bg-secondary-bg py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <nav
              aria-label={language === 'am' ? 'የዝግጅት ጊዜ' : 'Event timeframe'}
              className="flex flex-wrap gap-2"
            >
              {(['upcoming', 'past', 'all'] as const).map((value) => (
                <FilterLink
                  key={value}
                  value={value}
                  current={timeframe}
                  view={view}
                  language={language}
                />
              ))}
            </nav>
            <div
              role="group"
              aria-label={language === 'am' ? 'የዝግጅት እይታ' : 'Event view'}
              className="flex gap-2"
            >
              <ViewLink value="list" current={view} timeframe={timeframe} language={language} />
              <ViewLink value="calendar" current={view} timeframe={timeframe} language={language} />
            </div>
          </div>
          {view === 'calendar' ? (
            <EventCalendar events={page.data} language={language} />
          ) : (
            <EventsList events={page.data} language={language} />
          )}
        </div>
      </section>
    </>
  );
}

function FilterLink({
  value,
  current,
  view,
  language,
}: {
  value: EventTimeframe;
  current: EventTimeframe;
  view: EventView;
  language: Language;
}) {
  const labels = {
    upcoming: language === 'am' ? 'መጪ' : 'Upcoming',
    past: language === 'am' ? 'ያለፉ' : 'Past',
    all: language === 'am' ? 'ሁሉም' : 'All events',
  };
  return (
    <Link
      href={localizedHref(`/events?timeframe=${value}&view=${view}`, language)}
      aria-current={current === value ? 'page' : undefined}
      className={
        current === value
          ? 'bg-primary min-h-11 rounded-full px-5 py-2.5 font-semibold text-white'
          : 'bg-card text-heading min-h-11 rounded-full border px-5 py-2.5 font-semibold'
      }
    >
      {labels[value]}
    </Link>
  );
}

function ViewLink({
  value,
  current,
  timeframe,
  language,
}: {
  value: EventView;
  current: EventView;
  timeframe: EventTimeframe;
  language: Language;
}) {
  const active = current === value;
  const Icon = value === 'list' ? List : CalendarDays;
  return (
    <Link
      href={localizedHref(`/events?timeframe=${timeframe}&view=${value}`, language)}
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? 'bg-primary inline-flex min-h-11 items-center gap-2 rounded-lg px-4 font-semibold text-white'
          : 'bg-card text-heading inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 font-semibold'
      }
    >
      <Icon aria-hidden="true" className="size-5" />
      {value === 'list'
        ? language === 'am'
          ? 'ዝርዝር'
          : 'List'
        : language === 'am'
          ? 'ቀን መቁጠሪያ'
          : 'Calendar'}
    </Link>
  );
}
