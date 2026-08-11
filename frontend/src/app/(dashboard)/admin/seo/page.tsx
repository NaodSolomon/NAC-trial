import type { Metadata } from 'next';
import { SeoAdmin } from '@/features/seo/SeoAdmin';

export const metadata: Metadata = { title: 'SEO metadata' };

export default function SeoAdministrationPage() {
  return <SeoAdmin />;
}
