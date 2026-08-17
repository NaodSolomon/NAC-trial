import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PageBanner from '@/components/common/PageBanner';
import { EventSingle, eventImage, loadPublicEvent } from '@/features/events';
import { isApiRequestError } from '@/lib/api/errors';
import { localizedHref, translate, type Language } from '@/lib/i18n';
import { resolveRequestLanguage } from '@/lib/i18n/server';
import { serializeJsonLd } from '@/lib/seo/json-ld';
import { absoluteUrl, buildLocalizedMetadata, localizedUrl } from '@/lib/seo/site';

interface EventPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const language = await resolveRequestLanguage((await searchParams).lang);
  const event = await getEvent(slug, language);
  return buildLocalizedMetadata({
    pathname: `/events/${slug}`,
    language,
    title: event.title,
    description: event.description,
    imageUrl: eventImage(event.slug),
  });
}

export default async function EventDetailPage({ params, searchParams }: EventPageProps) {
  const { slug } = await params;
  const language = await resolveRequestLanguage((await searchParams).lang);
  const event = await getEvent(slug, language);
  const eventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: event.location },
    image: [absoluteUrl(eventImage(event.slug))],
    url: localizedUrl(`/events/${slug}`, language),
    inLanguage: language,
    organizer: { '@type': 'Organization', name: 'Nehemiah Autism Center' },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(eventJsonLd) }}
      />
      <PageBanner
        title={event.title}
        breadcrumbs={[
          { label: translate(language, 'home'), href: localizedHref('/', language) },
          {
            label: language === 'am' ? 'ዝግጅቶች' : 'Events',
            href: localizedHref('/events', language),
          },
          { label: event.title },
        ]}
        backgroundImage={eventImage(event.slug)}
      />
      <section className="bg-secondary-bg py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <EventSingle event={event} language={language} />
        </div>
      </section>
    </>
  );
}

async function getEvent(slug: string, language: Language) {
  try {
    return await loadPublicEvent(slug, language);
  } catch (error) {
    if (isApiRequestError(error) && error.kind === 'NOT_FOUND') notFound();
    throw error;
  }
}
