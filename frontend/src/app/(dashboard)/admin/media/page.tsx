import type { Metadata } from 'next';
import { MediaAdmin } from '@/features/media';
export const metadata: Metadata = { title: 'Media administration' };
export default function MediaAdministrationPage() {
  return <MediaAdmin />;
}
