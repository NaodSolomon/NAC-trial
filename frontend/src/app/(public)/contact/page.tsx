import type { Metadata } from 'next';
import { ContactPage } from '@/features/contact';
import { resolveRequestLanguage } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'Contact | Nehemiah',
};

export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const query = await searchParams;
  return <ContactPage language={await resolveRequestLanguage(query.lang)} />;
}
