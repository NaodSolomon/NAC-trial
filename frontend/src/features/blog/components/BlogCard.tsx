import Image from 'next/image';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { sanitizeCmsText } from '@/features/cms/sanitize-cms';
import { localizedHref, type Language } from '@/lib/i18n';
import type { PublishedBlogPost } from '../blog.types';
import { blogImage } from '../blog.utils';

export default function BlogCard({
  post,
  language,
  imageIndex,
}: {
  post: PublishedBlogPost;
  language: Language;
  imageIndex: number;
}) {
  const href = localizedHref('/blog/' + post.slug, language);
  return (
    <article className="bg-card overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md">
      <Link href={href} className="group block">
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={blogImage(post.seoImageUrl, imageIndex)}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
        <div className="p-6">
          <p className="text-foreground flex items-center gap-2 text-xs">
            <Calendar aria-hidden="true" className="size-4" />
            {formatBlogDate(post.publishedAt, language)}
          </p>
          <h2 className="text-heading group-hover:text-primary mt-3 text-xl font-semibold">
            {post.title}
          </h2>
          <p className="text-foreground mt-3 line-clamp-3 leading-7">
            {sanitizeCmsText(post.excerpt)}
          </p>
          <span className="text-primary mt-5 inline-block font-semibold">
            {language === 'am' ? 'ተጨማሪ ያንብቡ' : 'Read article'} &rarr;
          </span>
        </div>
      </Link>
    </article>
  );
}

export function formatBlogDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-US', {
    dateStyle: 'long',
  }).format(new Date(value));
}
