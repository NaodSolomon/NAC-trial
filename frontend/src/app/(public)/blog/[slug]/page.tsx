import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PageBanner from '@/components/common/PageBanner';
import { BlogSingle, blogImage, loadPublishedBlog, serializeJsonLd } from '@/features/blog';
import { isApiRequestError } from '@/lib/api/errors';
import { localizedHref, type Language } from '@/lib/i18n';
import { resolveRequestLanguage } from '@/lib/i18n/server';

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
  const canonical = articleUrl(slug, language);
  const description = post.seoDescription ?? post.excerpt;
  const image = articleImage(post.seoImageUrl);
  return {
    title: post.seoTitle ?? post.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title: post.seoTitle ?? post.title,
      description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seoTitle ?? post.title,
      description,
      images: [image],
    },
  };
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
          { label: language === 'am' ? 'መነሻ' : 'Home', href: localizedHref('/', language) },
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

function siteUrl() {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
}

function articleUrl(slug: string, language: Language) {
  return new URL(localizedHref('/blog/' + slug, language), siteUrl()).toString();
}

function articleImage(value: string | null) {
  return new URL(blogImage(value), siteUrl()).toString();
}
