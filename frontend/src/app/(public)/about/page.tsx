import type { Metadata } from 'next';
import { AboutPage } from '@/features/about';

export const metadata: Metadata = {
  title: 'About Us | Nehemiah',
};

export default function Page() {
  return <AboutPage />;
}
