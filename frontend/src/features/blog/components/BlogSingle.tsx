import Image from 'next/image';
import { Calendar } from 'lucide-react';
import { CmsArticle } from '@/features/cms/components/CmsArticle';
import type { Language } from '@/lib/i18n';
import type { PublishedBlogPost } from '../blog.types';
import { blogImage } from '../blog.utils';
import { formatBlogDate } from './BlogCard';

export default function BlogSingle({
  post,
  language,
  canonicalUrl,
}: {
  post: PublishedBlogPost;
  language: Language;
  canonicalUrl: string;
}) {
  const encodedUrl = encodeURIComponent(canonicalUrl);
  const encodedTitle = encodeURIComponent(post.title);
  return (
    <article>
      <div className="relative aspect-video overflow-hidden rounded-xl">
        <Image
          src={blogImage(post.seoImageUrl)}
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 70vw"
          className="object-cover"
        />
      </div>
      <p className="text-foreground mt-6 flex items-center gap-2 text-sm">
        <Calendar aria-hidden="true" className="size-4" />
        {formatBlogDate(post.publishedAt, language)}
      </p>
      <div className="mt-8">
        <CmsArticle content={post.content} />
      </div>
      <footer className="mt-10 border-t pt-7">
        <h2 className="text-heading text-lg font-semibold">
          {language === 'am' ? 'ይህን ጽሑፍ ያጋሩ' : 'Share this article'}
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <ShareLink
            href={'https://www.facebook.com/sharer/sharer.php?u=' + encodedUrl}
            label="Facebook"
          />
          <ShareLink
            href={'https://twitter.com/intent/tweet?url=' + encodedUrl + '&text=' + encodedTitle}
            label="X"
          />
          <ShareLink
            href={'https://www.linkedin.com/sharing/share-offsite/?url=' + encodedUrl}
            label="LinkedIn"
          />
          <ShareLink
            href={'mailto:?subject=' + encodedTitle + '&body=' + encodedUrl}
            label={language === 'am' ? 'ኢሜይል' : 'Email'}
          />
        </div>
      </footer>
    </article>
  );
}

function ShareLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary inline-flex min-h-11 items-center rounded-full border px-5 font-semibold hover:underline"
    >
      {label}
    </a>
  );
}
