import type { Metadata } from 'next';
import PageBanner from '@/components/common/PageBanner';
import EventsList from '@/features/events/components/EventsList';
import EventSidebar from '@/features/events/components/EventSidebar';

export const metadata: Metadata = {
  title: 'Events - Nehemiah',
  description:
    'Join us at our upcoming events and be a part of the change you wish to see in the world.',
};

export default function EventsPage() {
  return (
    <>
      <PageBanner
        title="Our Events"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Events' },
        ]}
        backgroundImage="/images/event_1.jpg"
      />
      <section className="bg-secondary-bg py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <EventsList />
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
