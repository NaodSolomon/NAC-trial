import type { Metadata } from 'next';
import { ResourceAdmin } from '@/features/resources/ResourceAdmin';
export const metadata: Metadata = { title: 'Resource administration' };
export default function ResourceAdministrationPage() {
  return <ResourceAdmin />;
}
