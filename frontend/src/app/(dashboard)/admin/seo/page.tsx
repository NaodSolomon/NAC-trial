import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const SeoAdmin = dynamic(() => import('@/features/seo/SeoAdmin').then((module) => module.SeoAdmin));

export const metadata: Metadata = { title: 'SEO metadata' };

export default function SeoAdministrationPage() {
  return <SeoAdmin />;
}
