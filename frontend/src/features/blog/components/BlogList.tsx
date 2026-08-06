import Link from 'next/link';
import BlogCard from './BlogCard';
import type { BlogPageData } from '../blog.types';
import { localizedHref, type Language } from '@/lib/i18n';

export default function BlogList({ page, language }: { page: BlogPageData; language: Language }) {
  if (!page.data.length) {
    return (
      <div role="status" className="bg-card rounded-xl border p-12 text-center">
        <h2 className="text-heading text-2xl font-semibold">
          {language === 'am' ? 'ጽሑፎች በቅርቡ ይታከላሉ' : 'Articles will be added soon'}
        </h2>
        <p className="text-foreground mt-3">
          {language === 'am'
            ? 'አዲስ ዜናና መረጃ ለማግኘት ደግመው ይጎብኙ።'
            : 'Check back for news, practical guidance, and community stories.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-8 md:grid-cols-2">
        {page.data.map((post, index) => (
          <BlogCard key={post.id} post={post} language={language} imageIndex={index} />
        ))}
      </div>
      {page.meta.totalPages > 1 && (
        <nav
          aria-label={language === 'am' ? 'የጽሑፍ ገጾች' : 'Blog pages'}
          className="mt-12 flex items-center justify-center gap-3"
        >
          <PaginationLink
            page={page.meta.page - 1}
            current={page.meta.page}
            total={page.meta.totalPages}
            language={language}
            label={language === 'am' ? 'ቀዳሚ' : 'Previous'}
          />
          <span aria-live="polite" className="text-foreground px-3">
            {language === 'am' ? 'ገጽ' : 'Page'} {page.meta.page} / {page.meta.totalPages}
          </span>
          <PaginationLink
            page={page.meta.page + 1}
            current={page.meta.page}
            total={page.meta.totalPages}
            language={language}
            label={language === 'am' ? 'ቀጣይ' : 'Next'}
          />
        </nav>
      )}
    </>
  );
}

function PaginationLink({
  page,
  current,
  total,
  language,
  label,
}: {
  page: number;
  current: number;
  total: number;
  language: Language;
  label: string;
}) {
  const unavailable = page < 1 || page > total || page === current;
  if (unavailable) {
    return (
      <span aria-disabled="true" className="min-h-11 rounded border px-5 py-2 opacity-45">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={localizedHref('/blog?page=' + page, language)}
      className="text-primary min-h-11 rounded border px-5 py-2 font-semibold hover:underline"
    >
      {label}
    </Link>
  );
}
