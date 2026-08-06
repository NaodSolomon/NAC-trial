import type { Metadata } from 'next';
import { Search } from 'lucide-react';
import PageBanner from '@/components/common/PageBanner';
import { SearchResults, loadPublicSearch, validateSearchTerm } from '@/features/search';
import { resolveRequestLanguage } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'Search | Nehemiah Autism Center',
  description: 'Search published pages, events, and blog posts from Nehemiah Autism Center.',
};

interface SearchRouteProps {
  searchParams: Promise<{ q?: string; lang?: string }>;
}

export default async function SearchPage({ searchParams }: SearchRouteProps) {
  const query = await searchParams;
  const language = await resolveRequestLanguage(query.lang);
  const validation = validateSearchTerm(query.q);
  const title = language === 'am' ? 'ፍለጋ' : 'Search';
  const response =
    validation.kind === 'valid' ? await loadPublicSearch(validation.term, language) : null;

  return (
    <>
      <PageBanner
        title={title}
        breadcrumbs={[
          { label: language === 'am' ? 'መነሻ' : 'Home', href: '/?lang=' + language },
          { label: title },
        ]}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <form
            action="/search"
            method="get"
            role="search"
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input type="hidden" name="lang" value={language} />
            <label className="flex-1">
              <span className="text-heading mb-2 block font-semibold">
                {language === 'am' ? 'የፍለጋ ቃል' : 'Search term'}
              </span>
              <input
                type="search"
                name="q"
                defaultValue={validation.term}
                minLength={2}
                maxLength={100}
                required
                aria-describedby={validation.kind === 'invalid' ? 'search-error' : undefined}
                className="border-input min-h-12 w-full rounded-lg border px-4"
                placeholder={
                  language === 'am'
                    ? 'ገጾችን፣ ዝግጅቶችንና ጽሑፎችን ይፈልጉ'
                    : 'Search pages, events, and articles'
                }
              />
            </label>
            <button
              type="submit"
              className="bg-primary hover:bg-primary-hover mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-7 font-semibold text-white"
            >
              <Search aria-hidden="true" className="size-5" />
              {language === 'am' ? 'ፈልግ' : 'Search'}
            </button>
          </form>

          {validation.kind === 'missing' && (
            <div role="status" className="bg-secondary-bg mt-10 rounded-xl border p-10 text-center">
              <h2 className="text-heading text-2xl font-semibold">
                {language === 'am' ? 'ምን መፈለግ ይፈልጋሉ?' : 'What are you looking for?'}
              </h2>
              <p className="text-foreground mt-2">
                {language === 'am'
                  ? 'ቢያንስ ሁለት ፊደላት ያስገቡ።'
                  : 'Enter at least two characters to search published content.'}
              </p>
            </div>
          )}
          {validation.kind === 'invalid' && (
            <p
              id="search-error"
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive mt-6 rounded-lg border p-4"
            >
              {language === 'am'
                ? 'የፍለጋ ቃሉ ከ2 እስከ 100 ፊደላት መሆን አለበት።'
                : 'Search terms must contain between 2 and 100 characters.'}
            </p>
          )}
          {response && <SearchResults response={response} language={language} />}
        </div>
      </section>
    </>
  );
}
