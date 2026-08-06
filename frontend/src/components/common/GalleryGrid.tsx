'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = ['all', 'education', 'health', 'community', 'events'] as const;

const galleryItems = [
  { src: '/images/gallery_1.jpg', alt: 'Education program', category: 'education' },
  { src: '/images/gallery_2.jpg', alt: 'Health initiative', category: 'health' },
  { src: '/images/gallery_3.jpg', alt: 'Community outreach', category: 'community' },
  { src: '/images/gallery_4.jpg', alt: 'Fundraising event', category: 'events' },
  { src: '/images/gallery_5.jpg', alt: 'School building project', category: 'education' },
  { src: '/images/gallery_6.jpg', alt: 'Medical camp', category: 'health' },
  { src: '/images/gallery_7.jpg', alt: 'Community gathering', category: 'community' },
  { src: '/images/gallery_8.jpg', alt: 'Charity marathon', category: 'events' },
];

export default function GalleryGrid() {
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filteredItems =
    activeFilter === 'all'
      ? galleryItems
      : galleryItems.filter((item) => item.category === activeFilter);

  return (
    <div>
      {/* Filter Buttons */}
      <div className="mb-8 flex flex-wrap justify-center gap-3">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveFilter(category)}
            className={cn(
              'rounded px-6 py-2 text-sm font-semibold capitalize transition',
              activeFilter === category
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-text-dark hover:bg-gray-200',
            )}
          >
            {category === 'all' ? 'All' : category}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {filteredItems.map((item) => (
          <div
            key={item.src}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg"
          >
            <Image src={item.src} alt={item.alt} fill className="object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-primary/60 opacity-0 transition group-hover:opacity-100">
              <ZoomIn className="size-8 text-white" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
