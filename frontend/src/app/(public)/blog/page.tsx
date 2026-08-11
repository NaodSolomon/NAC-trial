import type { Metadata } from 'next';
import PageBanner from '@/components/common/PageBanner';
import { BlogList, loadPublishedBlogs, parseBlogPage } from '@/features/blog';
import { localizedHref } from '@/lib/i18n';
import { resolveRequestLanguage } from '@/lib/i18n/server';

import { buildLocalizedMetadata } from '@/lib/seo/site';

interface BlogRouteProps {
  searchParams: Promise<{ lang?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: BlogRouteProps): Promise<Metadata> {
  const language = await resolveRequestLanguage((await searchParams).lang);
  return buildLocalizedMetadata({
    pathname: '/blog',
    language,
    title: language === 'am' ? 'ጽሑፎችና ዜና' : 'News and stories',
    description:
      language === 'am'
        ? 'ከነህምያ ኦቲዝም ማዕከል የታተሙ ዜናዎች፣ የቤተሰብ መመሪያዎች እና ታሪኮች።'
        : 'Published news, family guidance, and community stories from Nehemiah Autism Center.',
  });
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
