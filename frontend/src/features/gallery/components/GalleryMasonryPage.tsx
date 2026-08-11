import GalleryPage from './GalleryPage';

export default function GalleryMasonryPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; page?: string; type?: string }>;
}) {
  return <GalleryPage searchParams={searchParams} layoutOverride="masonry" />;
}
