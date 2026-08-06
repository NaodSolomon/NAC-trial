import EventCard from '@/components/common/EventCard';
import AnimateOnScroll from '@/components/common/AnimateOnScroll';
import { events } from '@/features/events/data';

export default function EventsList() {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <AnimateOnScroll key={event.slug} animation="fadeUp">
          <EventCard
            image={event.image}
            title={event.title}
            description={event.description}
            date={event.date}
            slug={event.slug}
          />
        </AnimateOnScroll>
      ))}
    </div>
  );
}
