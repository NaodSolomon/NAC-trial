'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Maximize2, Play, X } from 'lucide-react';
import type { Language } from '@/lib/i18n';
import type { GalleryLayout, PublicGalleryItem } from '../gallery.types';

export function GalleryExplorer({
  items,
  language,
  layout,
}: {
  items: PublicGalleryItem[];
  language: Language;
  layout: GalleryLayout;
}) {
  const [selected, setSelected] = useState<PublicGalleryItem | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const current = dialog.current;
    if (!current) return;
    if (selected && !current.open) {
      current.showModal();
      closeButton.current?.focus();
    }
  }, [selected]);

  function open(item: PublicGalleryItem, source: HTMLElement) {
    trigger.current = source;
    setSelected(item);
  }

  function close() {
    dialog.current?.querySelectorAll('video').forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });
    dialog.current?.close();
    setSelected(null);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  if (!items.length) {
    return (
      <div role="status" className="bg-secondary-bg rounded-xl border p-12 text-center">
        <h2 className="text-heading text-2xl font-semibold">
          {language === 'am' ? 'ሚዲያ በቅርቡ ይጨመራል' : 'Gallery media will be added soon'}
        </h2>
        <p className="text-foreground mt-2">
          {language === 'am'
            ? 'አዳዲስ ምስሎችና ቪዲዮዎችን ለማየት እንደገና ይጎብኙ።'
            : 'Check back for new images and videos from the center.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={
          layout === 'masonry'
            ? 'columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4'
            : 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }
      >
        {items.map((item, index) => (
          <article
            key={item.id}
            className={
              layout === 'masonry'
                ? 'bg-card mb-5 break-inside-avoid overflow-hidden rounded-xl border shadow-sm'
                : 'bg-card overflow-hidden rounded-xl border shadow-sm'
            }
          >
            {item.type === 'IMAGE' ? (
              <button
                type="button"
                onClick={(event) => open(item, event.currentTarget)}
                aria-label={`${language === 'am' ? 'ምስሉን ይክፈቱ' : 'Open image'}: ${item.title}`}
                className={`group relative block w-full overflow-hidden ${layout === 'masonry' && index % 3 === 0 ? 'aspect-[4/5]' : 'aspect-[4/3]'}`}
              >
                <Image
                  src={item.imageUrl}
                  alt={item.altText}
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                />
                <span className="bg-primary/70 absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
                  <Maximize2 aria-hidden="true" className="size-8 text-white" />
                </span>
              </button>
            ) : (
              <div>
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster="/images/gallery_8.jpg"
                  aria-label={item.altText}
                  className="aspect-video w-full bg-black object-cover"
                >
                  <source src={item.mediaUrl} />
                </video>
                <button
                  type="button"
                  onClick={(event) => open(item, event.currentTarget)}
                  className="text-primary mx-5 mt-4 inline-flex min-h-11 items-center gap-2 rounded border px-4 font-semibold hover:underline"
                >
                  <Play aria-hidden="true" className="size-4" />
                  {language === 'am' ? 'ቪዲዮውን በትልቅ ይክፈቱ' : 'Open video in lightbox'}
                </button>
              </div>
            )}
            <div className="p-5">
              <h2 className="text-heading text-lg font-semibold">{item.title}</h2>
              <p className="text-foreground mt-2 text-sm">{item.altText}</p>
            </div>
          </article>
        ))}
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="gallery-dialog-title"
        aria-describedby="gallery-dialog-description"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => {
          setSelected(null);
          requestAnimationFrame(() => trigger.current?.focus());
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto max-h-[92vh] w-[min(92vw,1100px)] rounded-xl bg-white p-0 shadow-2xl backdrop:bg-black/80"
      >
        {selected && (
          <div>
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <h2 id="gallery-dialog-title" className="text-heading text-xl font-semibold">
                  {selected.title}
                </h2>
                <p id="gallery-dialog-description" className="text-foreground mt-1 text-sm">
                  {selected.altText}
                </p>
              </div>
              <button
                ref={closeButton}
                type="button"
                onClick={close}
                aria-label={language === 'am' ? 'ማዕከለ ስዕሉን ዝጋ' : 'Close lightbox'}
                className="hover:bg-secondary-bg inline-flex size-11 shrink-0 items-center justify-center rounded-full border"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <div className="relative flex min-h-64 items-center justify-center bg-black sm:min-h-[520px]">
              {selected.type === 'IMAGE' ? (
                <Image
                  src={selected.imageUrl}
                  alt={selected.altText}
                  fill
                  sizes="92vw"
                  className="object-contain"
                />
              ) : (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster="/images/gallery_8.jpg"
                  aria-label={selected.altText}
                  className="max-h-[70vh] w-full"
                >
                  <source src={selected.mediaUrl} />
                </video>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
