import type { Metadata } from 'next';
import { GalleryMasonryPage } from '@/features/gallery';

export const metadata: Metadata = {
  title: 'Gallery Masonry | Nehemiah',
};

export default function Page() {
  return <GalleryMasonryPage />;
}
