import Image from 'next/image';
import PageBanner from '@/components/common/PageBanner';

const masonryImages = [
  { src: '/images/gallery_1.jpg', alt: 'Gallery image 1', aspect: 'aspect-[3/4]' },
  { src: '/images/gallery_2.jpg', alt: 'Gallery image 2', aspect: 'aspect-square' },
  { src: '/images/gallery_3.jpg', alt: 'Gallery image 3', aspect: 'aspect-[4/5]' },
  { src: '/images/gallery_4.jpg', alt: 'Gallery image 4', aspect: 'aspect-[3/2]' },
  { src: '/images/gallery_5.jpg', alt: 'Gallery image 5', aspect: 'aspect-[2/3]' },
  { src: '/images/gallery_6.jpg', alt: 'Gallery image 6', aspect: 'aspect-square' },
  { src: '/images/gallery_7.jpg', alt: 'Gallery image 7', aspect: 'aspect-[4/3]' },
  { src: '/images/gallery_8.jpg', alt: 'Gallery image 8', aspect: 'aspect-[3/4]' },
];

export default function GalleryMasonryPage() {
  return (
    <>
      <PageBanner
        title="Photo Gallery"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Gallery', href: '/gallery' },
          { label: 'Masonry' },
        ]}
      />

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [column-fill:_balance]">
            {masonryImages.map((img) => (
              <div key={img.src} className="mb-4 break-inside-avoid">
                <div className={`relative ${img.aspect} overflow-hidden rounded-lg`}>
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
