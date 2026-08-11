import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

const CmsPageEditor = dynamic(() =>
  import('@/features/cms/components/CmsPageEditor').then((module) => module.CmsPageEditor),
);

export const metadata: Metadata = { title: 'Edit CMS page' };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditCmsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  return <CmsPageEditor pageId={id} />;
}
