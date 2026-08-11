import type { Metadata } from 'next';
import { GalleryAdmin } from '@/features/gallery/GalleryAdmin';
export const metadata: Metadata = { title: 'Gallery administration' };
export default function GalleryAdministrationPage() {
  return <GalleryAdmin />;
}
