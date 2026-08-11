import type { Metadata } from 'next';
import { CmsPageEditor } from '@/features/cms/components/CmsPageEditor';

export const metadata: Metadata = { title: 'Create CMS page' };

export default function CreateCmsPage() {
  return <CmsPageEditor />;
}
