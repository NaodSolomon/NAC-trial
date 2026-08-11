import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const CmsPageEditor = dynamic(() =>
  import('@/features/cms/components/CmsPageEditor').then((module) => module.CmsPageEditor),
);

export const metadata: Metadata = { title: 'Create CMS page' };

export default function CreateCmsPage() {
  return <CmsPageEditor />;
}
