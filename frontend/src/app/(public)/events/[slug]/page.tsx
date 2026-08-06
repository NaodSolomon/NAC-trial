import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PageBanner from '@/components/common/PageBanner';
import { EventSingle, eventImage, loadPublicEvent } from '@/features/events';
import { isApiRequestError } from '@/lib/api/errors';
import { localizedHref, type Language } from '@/lib/i18n';
import { resolveRequestLanguage } from '@/lib/i18n/server';

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
  return {
    title: `${event.title} | Nehemiah Autism Center`,
    description: event.description,
    openGraph: {
      type: 'website',
      title: event.title,
      description: event.description,
      images: [{ url: new URL(eventImage(event.slug), siteUrl()).toString() }],
    },
  };
}

export default async function EventDetailPage({ params, searchParams }: EventPageProps) {
  const { slug } = await params;
  const language = await resolveRequestLanguage((await searchParams).lang);
  const event = await getEvent(slug, language);
  return (
    <>
      <PageBanner
        title={event.title}
        breadcrumbs={[
          { label: language === 'am' ? 'መነሻ' : 'Home', href: localizedHref('/', language) },
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

function siteUrl() {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
}
