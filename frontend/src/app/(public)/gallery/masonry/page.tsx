import type { Metadata } from 'next';
import { GalleryMasonryPage } from '@/features/gallery';

export const metadata: Metadata = {
  title: 'Gallery Masonry | Nehemiah Autism Center',
};

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; page?: string; type?: string }>;
}) {
  return <GalleryMasonryPage searchParams={searchParams} />;
}
