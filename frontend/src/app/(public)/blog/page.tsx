import type { Metadata } from 'next';
import PageBanner from '@/components/common/PageBanner';
import { BlogList, loadPublishedBlogs, parseBlogPage } from '@/features/blog';
import { localizedHref } from '@/lib/i18n';
import { resolveRequestLanguage } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'Blog | Nehemiah Autism Center',
  description:
    'Published news, family guidance, and community stories from Nehemiah Autism Center.',
};

interface BlogRouteProps {
  searchParams: Promise<{ lang?: string; page?: string }>;
}

export default async function BlogPage({ searchParams }: BlogRouteProps) {
  const query = await searchParams;
  const language = await resolveRequestLanguage(query.lang);
  const page = await loadPublishedBlogs(language, parseBlogPage(query.page));
  const title = language === 'am' ? 'ጽሑፎችና ዜና' : 'News and stories';
  return (
    <>
      <PageBanner
        title={title}
        breadcrumbs={[
          { label: language === 'am' ? 'መነሻ' : 'Home', href: localizedHref('/', language) },
          { label: language === 'am' ? 'ብሎግ' : 'Blog' },
        ]}
        backgroundImage="/images/blog_1.jpg"
      />
      <section className="bg-secondary-bg py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <BlogList page={page} language={language} />
        </div>
      </section>
    </>
  );
}
