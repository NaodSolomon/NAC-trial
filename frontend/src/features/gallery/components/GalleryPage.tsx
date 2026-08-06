import PageBanner from '@/components/common/PageBanner';
import GalleryGrid from '@/components/common/GalleryGrid';

export default function GalleryPage() {
  return (
    <>
      <PageBanner
        title="Photo Gallery"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Gallery' }]}
      />

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <GalleryGrid />
        </div>
      </section>
    </>
  );
}
