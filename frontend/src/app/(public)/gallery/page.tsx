import type { Metadata } from 'next';
import { GalleryPage } from '@/features/gallery';

export const metadata: Metadata = {
  title: 'Gallery | Nehemiah',
};

export default function Page() {
  return <GalleryPage />;
}
