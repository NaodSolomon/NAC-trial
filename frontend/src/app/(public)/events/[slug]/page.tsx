import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PageBanner from '@/components/common/PageBanner';
import EventSingle from '@/features/events/components/EventSingle';
import EventSidebar from '@/features/events/components/EventSidebar';
import { events } from '@/features/events/data';

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return events.map((event) => ({
    slug: event.slug,
  }));
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = events.find((e) => e.slug === slug);

  if (!event) {
    return { title: 'Event Not Found - Nehemiah' };
  }

  return {
    title: `${event.title} - Nehemiah`,
    description: event.description,
  };
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = events.find((e) => e.slug === slug);

  if (!event) {
    notFound();
  }

  return (
    <>
      <PageBanner
        title={event.title}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Events', href: '/events' },
          { label: event.title },
        ]}
        backgroundImage={event.image}
      />
      <section className="bg-secondary-bg py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <EventSingle event={event} />
            </div>
            <div className="lg:col-span-4">
              <EventSidebar />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
