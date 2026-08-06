import type { Metadata } from 'next';
import { ContactPage } from '@/features/contact';

export const metadata: Metadata = {
  title: 'Contact | Nehemiah',
};

export default function Page() {
  return <ContactPage />;
}
