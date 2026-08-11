import type { Metadata } from 'next';
import { CmsAdminList } from '@/features/cms/components/CmsAdminList';

export const metadata: Metadata = { title: 'CMS pages' };

export default function CmsAdministrationPage() {
  return <CmsAdminList />;
}
