import Link from 'next/link';
import { loadPublicSettings } from '@/features/settings/public-settings.server';
import { Grid3X3, LayoutGrid } from 'lucide-react';
import PageBanner from '@/components/common/PageBanner';
import { localizedHref, translate, type Language } from '@/lib/i18n';
import { resolveRequestLanguage } from '@/lib/i18n/server';
import { loadPublicGallery } from '../gallery.server';
import type { GalleryFilter, GalleryLayout } from '../gallery.types';
import { parseGalleryFilter, parseGalleryLayout, parseGalleryPage } from '../gallery.utils';
import { GalleryExplorer } from './GalleryExplorer';

interface GalleryPageProps {
  searchParams: Promise<{ lang?: string; page?: string; type?: string; layout?: string }>;
  layoutOverride?: GalleryLayout;
}

export default async function GalleryPage({ searchParams, layoutOverride }: GalleryPageProps) {
  const settings = await loadPublicSettings();
  const query = await searchParams;
  const language = await resolveRequestLanguage(query.lang);
  const currentPage = parseGalleryPage(query.page);
  const filter = parseGalleryFilter(query.type);
  const layout = layoutOverride ?? parseGalleryLayout(query.layout);
  const gallery = await loadPublicGallery(language, currentPage, filter);
  const title = language === 'am' ? 'የምስልና ቪዲዮ ማዕከለ ስዕል' : 'Photo and video gallery';

  return (
    <>
      <PageBanner
        title={title}
        breadcrumbs={[
          { label: translate(language, 'home'), href: localizedHref('/', language) },
          { label: language === 'am' ? 'ማዕከለ ስዕል' : 'Gallery' },
        ]}
        backgroundImage={settings?.pageBanners.gallery ?? '/images/gallery_1.jpg'}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <nav
              aria-label={language === 'am' ? 'የሚዲያ ዓይነት' : 'Gallery media type'}
              className="flex flex-wrap gap-2"
            >
              {(['all', 'image', 'video'] as const).map((value) => (
                <FilterLink
                  key={value}
                  value={value}
                  current={filter}
                  layout={layout}
                  language={language}
                />
              ))}
            </nav>
            <div
              role="group"
              aria-label={language === 'am' ? 'የማዕከለ ስዕል አቀማመጥ' : 'Gallery layout'}
              className="flex gap-2"
            >
              <LayoutLink value="grid" current={layout} filter={filter} language={language} />
              <LayoutLink value="masonry" current={layout} filter={filter} language={language} />
            </div>
          </div>

          <GalleryExplorer items={gallery.data} language={language} layout={layout} />
          <GalleryPagination
            page={gallery.meta.page}
            totalPages={gallery.meta.totalPages}
            filter={filter}
            layout={layout}
            language={language}
          />
        </div>
      </section>
    </>
  );
}

function FilterLink({
  value,
  current,
  layout,
  language,
}: {
  value: GalleryFilter;
  current: GalleryFilter;
  layout: GalleryLayout;
  language: Language;
}) {
  const labels = {
    all: language === 'am' ? 'ሁሉም' : 'All media',
    image: language === 'am' ? 'ምስሎች' : 'Images',
    video: language === 'am' ? 'ቪዲዮዎች' : 'Videos',
  };
  return (
    <Link
      href={galleryHref(1, value, layout, language)}
      aria-current={current === value ? 'page' : undefined}
      className={
        current === value
          ? 'bg-primary min-h-11 rounded-full px-5 py-2.5 font-semibold text-white'
          : 'bg-card text-heading min-h-11 rounded-full border px-5 py-2.5 font-semibold'
      }
    >
      {labels[value]}
    </Link>
  );
}

function LayoutLink({
  value,
  current,
  filter,
  language,
}: {
  value: GalleryLayout;
  current: GalleryLayout;
  filter: GalleryFilter;
  language: Language;
}) {
  const active = current === value;
  const Icon = value === 'grid' ? Grid3X3 : LayoutGrid;
  return (
    <Link
      href={galleryHref(1, filter, value, language)}
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? 'bg-primary inline-flex min-h-11 items-center gap-2 rounded-lg px-4 font-semibold text-white'
          : 'bg-card text-heading inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 font-semibold'
      }
    >
      <Icon aria-hidden="true" className="size-5" />
      {value === 'grid'
        ? language === 'am'
          ? 'ፍርግርግ'
          : 'Grid'
        : language === 'am'
          ? 'ሞዛይክ'
          : 'Masonry'}
    </Link>
  );
}

function GalleryPagination({
  page,
  totalPages,
  filter,
  layout,
  language,
}: {
  page: number;
  totalPages: number;
  filter: GalleryFilter;
  layout: GalleryLayout;
  language: Language;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label={language === 'am' ? 'የማዕከለ ስዕል ገጾች' : 'Gallery pages'}
      className="mt-12 flex items-center justify-center gap-3"
    >
      {page > 1 ? (
        <Link
          href={galleryHref(page - 1, filter, layout, language)}
          className="text-primary min-h-11 rounded border px-5 py-2 font-semibold hover:underline"
        >
          {language === 'am' ? 'ቀዳሚ' : 'Previous'}
        </Link>
      ) : (
        <span aria-disabled="true" className="min-h-11 rounded border px-5 py-2 opacity-45">
          {language === 'am' ? 'ቀዳሚ' : 'Previous'}
        </span>
      )}
      <span aria-live="polite" className="text-foreground px-3">
        {language === 'am' ? 'ገጽ' : 'Page'} {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={galleryHref(page + 1, filter, layout, language)}
          className="text-primary min-h-11 rounded border px-5 py-2 font-semibold hover:underline"
        >
          {language === 'am' ? 'ቀጣይ' : 'Next'}
        </Link>
      ) : (
        <span aria-disabled="true" className="min-h-11 rounded border px-5 py-2 opacity-45">
          {language === 'am' ? 'ቀጣይ' : 'Next'}
        </span>
      )}
    </nav>
  );
}

function galleryHref(
  page: number,
  filter: GalleryFilter,
  layout: GalleryLayout,
  language: Language,
) {
  return localizedHref(`/gallery?page=${page}&type=${filter}&layout=${layout}`, language);
}
