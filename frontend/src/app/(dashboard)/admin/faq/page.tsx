import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const FaqAdmin = dynamic(() => import('@/features/faq/FaqAdmin').then((module) => module.FaqAdmin));
export const metadata: Metadata = { title: 'FAQ administration' };
export default function FaqAdministrationPage() {
  return <FaqAdmin />;
}
