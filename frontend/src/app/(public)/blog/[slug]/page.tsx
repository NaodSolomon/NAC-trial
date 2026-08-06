import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PageBanner from '@/components/common/PageBanner';
import BlogSingle from '@/features/blog/components/BlogSingle';
import BlogSidebar from '@/features/blog/components/BlogSidebar';
import { blogPosts } from '@/features/blog/data';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return { title: 'Post Not Found - Nehemiah' };
  }

  return {
    title: `${post.title} - Nehemiah`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <PageBanner
        title={post.title}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Blog', href: '/blog' },
          { label: post.title },
        ]}
        backgroundImage={post.image}
      />
      <section className="bg-secondary-bg py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <BlogSingle post={post} />
            </div>
            <div className="lg:col-span-4">
              <BlogSidebar />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
