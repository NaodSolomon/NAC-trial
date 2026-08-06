import Link from 'next/link';
import type { Language } from '@/lib/i18n';
import { localizedHref } from '@/lib/i18n';
import type { PublicEvent } from '../event.types';
import { eventDateKey, formatEventTimeRange } from '../event.utils';
import { EventsList } from './EventsList';

export function EventCalendar({ events, language }: { events: PublicEvent[]; language: Language }) {
  if (!events.length) return <EventsList events={events} language={language} />;
  const months = groupByMonth(events);
  return (
    <div>
      <div className="md:hidden">
        <EventsList events={events} language={language} />
      </div>
      <div className="hidden space-y-10 md:block">
        {months.map(({ key, events: monthEvents }) => (
          <section key={key} aria-labelledby={'event-month-' + key}>
            <h2 id={'event-month-' + key} className="text-heading text-2xl font-semibold">
              {formatMonth(key, language)}
            </h2>
            <div
              className="mt-5 grid grid-cols-7"
              role="grid"
              aria-label={formatMonth(key, language)}
            >
              {weekdayLabels(language).map((day) => (
                <div
                  key={day}
                  role="columnheader"
                  className="bg-secondary-bg border p-3 text-center text-sm font-semibold"
                >
                  {day}
                </div>
              ))}
              {calendarCells(key, monthEvents).map((cell, index) =>
                cell ? (
                  <div
                    key={cell.key}
                    role="gridcell"
                    className="min-h-36 border p-3"
                    aria-label={cell.key}
                  >
                    <span className="text-heading font-semibold">{Number(cell.key.slice(-2))}</span>
                    <div className="mt-2 space-y-2">
                      {cell.events.map((event) => (
                        <Link
                          key={event.id}
                          href={localizedHref('/events/' + event.slug, language)}
                          className="bg-primary/10 text-heading hover:bg-primary/20 block rounded p-2 text-sm"
                        >
                          <strong className="block">{event.title}</strong>
                          <span className="text-foreground mt-1 block text-xs">
                            {formatEventTimeRange(event.startDate, event.endDate, language)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    key={'empty-' + index}
                    role="gridcell"
                    aria-hidden="true"
                    className="bg-secondary-bg/40 min-h-36 border"
                  />
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function groupByMonth(events: PublicEvent[]) {
  const groups = new Map<string, PublicEvent[]>();
  for (const event of events) {
    const key = eventDateKey(event.startDate).slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.entries()].map(([key, groupedEvents]) => ({ key, events: groupedEvents }));
}

function calendarCells(monthKey: string, events: PublicEvent[]) {
  const [year, month] = monthKey.split('-').map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells: Array<{ key: string; events: PublicEvent[] } | null> =
    Array(firstWeekday).fill(null);
  for (let day = 1; day <= days; day += 1) {
    const key = `${monthKey}-${String(day).padStart(2, '0')}`;
    cells.push({ key, events: events.filter((event) => eventDateKey(event.startDate) === key) });
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

function formatMonth(monthKey: string, language: Language) {
  return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(monthKey + '-01T00:00:00Z'));
}

function weekdayLabels(language: Language) {
  const formatter = new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  });
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(Date.UTC(2027, 0, 3 + index))),
  );
}
