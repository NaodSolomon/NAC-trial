import type { Metadata } from 'next';
import { VolunteerPage } from '@/features/engagement/components/VolunteerPage';
import { resolveRequestLanguage } from '@/lib/i18n/server';

export const metadata: Metadata = { title: 'Volunteer | Nehemiah Autism Center' };

export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const query = await searchParams;
  return <VolunteerPage language={await resolveRequestLanguage(query.lang)} />;
}
