import type { Metadata } from 'next';
import { HomePage } from '@/features/home';

export const metadata: Metadata = {
  title: 'Nehemiah - Charity & Fundraising',
  description:
    'Nehemiah is a charity and fundraising organization dedicated to protecting children\'s rights, providing education, and building a better future for communities in need.',
};

export default function Page() {
  return <HomePage />;
}
