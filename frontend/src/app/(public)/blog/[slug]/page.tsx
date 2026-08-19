import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PageBanner from '@/components/common/PageBanner';
import { BlogSingle, blogImage, loadPublishedBlog } from '@/features/blog';
import { isApiRequestError } from '@/lib/api/errors';
import { localizedHref, translate, type Language } from '@/lib/i18n';
import { resolveRequestLanguage } from '@/lib/i18n/server';
import { serializeJsonLd } from '@/lib/seo/json-ld';
import { absoluteUrl, localizedUrl } from '@/lib/seo/site';
import { localizedPageMetadata } from '@/lib/seo/site.server';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const language = await resolveRequestLanguage((await searchParams).lang);
  const post = await getPost(slug, language);
  return localizedPageMetadata({
    pathname: `/blog/${slug}`,
    language,
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
    imageUrl: post.seoImageUrl ?? blogImage(null),
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
  });
}

export default async function BlogPostPage({ params, searchParams }: BlogPostPageProps) {
  const { slug } = await params;
  const language = await resolveRequestLanguage((await searchParams).lang);
  const post = await getPost(slug, language);
  const canonical = articleUrl(slug, language);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription ?? post.excerpt,
    image: articleImage(post.seoImageUrl),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: language,
    mainEntityOfPage: canonical,
    author: { '@type': 'Organization', name: 'Nehemiah Autism Center' },
    publisher: { '@type': 'Organization', name: 'Nehemiah Autism Center' },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <PageBanner
        title={post.title}
        breadcrumbs={[
          { label: translate(language, 'home'), href: localizedHref('/', language) },
          { label: language === 'am' ? 'ብሎግ' : 'Blog', href: localizedHref('/blog', language) },
          { label: post.title },
        ]}
        backgroundImage={blogImage(post.seoImageUrl)}
      />
      <section className="bg-secondary-bg py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <BlogSingle post={post} language={language} canonicalUrl={canonical} />
        </div>
      </section>
    </>
  );
}

async function getPost(slug: string, language: Language) {
  try {
    return await loadPublishedBlog(slug, language);
  } catch (error) {
    if (isApiRequestError(error) && error.kind === 'NOT_FOUND') notFound();
    throw error;
  }
}

function articleUrl(slug: string, language: Language) {
  return localizedUrl('/blog/' + slug, language);
}

function articleImage(value: string | null) {
  return absoluteUrl(blogImage(value));
}
