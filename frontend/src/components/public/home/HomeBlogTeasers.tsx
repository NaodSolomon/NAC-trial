import Image from 'next/image';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { homeCopy } from '@/features/home/home.copy';
import type { HomeBlogTeaser } from '@/features/home/home.types';
import { localizedHref, type Language } from '@/lib/i18n';
import { TeaserHeading } from './TeaserHeading';

export function HomeBlogTeasers({
  posts,
  language,
}: {
  posts: HomeBlogTeaser[];
  language: Language;
}) {
  if (!posts.length) return null;
  const copy = homeCopy[language];
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <TeaserHeading title={copy.blogTitle} description={copy.blogDescription} />
        <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article key={post.id} className="bg-card overflow-hidden rounded-xl border shadow-sm">
              <Link href={localizedHref(`/blog/${post.slug}`, language)} className="group block">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={post.imageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  {post.publishedAt && (
                    <p className="text-foreground flex items-center gap-2 text-xs">
                      <Calendar aria-hidden="true" className="size-4" />
                      {formatDate(post.publishedAt, language)}
                    </p>
                  )}
                  <h3 className="group-hover:text-primary mt-3 text-xl font-semibold">
                    {post.title}
                  </h3>
                  <p className="text-foreground mt-3 line-clamp-3 text-sm leading-relaxed">
                    {post.excerpt}
                  </p>
                  <span className="text-primary mt-4 inline-block text-sm font-semibold">
                    {copy.readMore} &rarr;
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
        <TeaserAction href={localizedHref('/blog', language)} label={copy.blogAction} />
      </div>
    </section>
  );
}

function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-US', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function TeaserAction({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-9 text-center">
      <Link
        href={href}
        className="text-primary inline-flex min-h-11 items-center font-semibold hover:underline"
      >
        {label} &rarr;
      </Link>
    </div>
  );
}

export { TeaserAction };
