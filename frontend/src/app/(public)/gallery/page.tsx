import type { Metadata } from 'next';
import { GalleryPage } from '@/features/gallery';

export const metadata: Metadata = {
  title: 'Gallery | Nehemiah Autism Center',
  description: 'Images and videos from Nehemiah Autism Center programs and community activities.',
};

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; page?: string; type?: string; layout?: string }>;
}) {
  return <GalleryPage searchParams={searchParams} />;
}
