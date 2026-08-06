import type { Metadata } from 'next';
import PageBanner from '@/components/common/PageBanner';
import BlogList from '@/features/blog/components/BlogList';
import BlogSidebar from '@/features/blog/components/BlogSidebar';

export const metadata: Metadata = {
  title: 'Blog - Nehemiah',
  description:
    'Stay up to date with the latest stories, updates, and insights from our organization.',
};

export default function BlogPage() {
  return (
    <>
      <PageBanner
        title="Our Blog"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Blog' },
        ]}
        backgroundImage="/images/blog_1.jpg"
      />
      <section className="bg-secondary-bg py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <BlogList />
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
