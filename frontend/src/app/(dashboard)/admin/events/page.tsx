import type { Metadata } from 'next';
import { EventAdmin } from '@/features/events/EventAdmin';
export const metadata: Metadata = { title: 'Event administration' };
export default function EventAdministrationPage() {
  return <EventAdmin />;
}
