import Link from 'next/link';
import type { Language } from '@/lib/i18n';
import type { PublicSearchResponse, SearchResultType } from '../search.types';
import { safeSearchExcerpt, searchResultHref } from '../search.utils';

const groupOrder: SearchResultType[] = ['page', 'event', 'blog'];

export function SearchResults({
  response,
  language,
}: {
  response: PublicSearchResponse;
  language: Language;
}) {
  if (!response.results.length) {
    return (
      <div role="status" className="bg-secondary-bg mt-10 rounded-xl border p-10 text-center">
        <h2 className="text-heading text-2xl font-semibold">
          {language === 'am' ? 'ምንም ውጤት አልተገኘም' : 'No results found'}
        </h2>
        <p className="text-foreground mt-2">
          {language === 'am' ? 'ሌላ ቃል ይሞክሩ።' : 'Try a different or more general search term.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-12">
      <p role="status" aria-live="polite" className="text-foreground">
        {language === 'am'
          ? response.results.length + ' ውጤቶች'
          : response.results.length + ' results for “' + response.query + '”'}
      </p>
      {groupOrder.map((type) => {
        const results = response.results.filter((result) => result.type === type);
        if (!results.length) return null;
        return (
          <section key={type} aria-labelledby={'search-group-' + type}>
            <h2 id={'search-group-' + type} className="text-heading text-2xl font-semibold">
              {groupLabel(type, language)}
            </h2>
            <ul className="mt-5 divide-y rounded-xl border bg-white px-6">
              {results.map((result) => (
                <li key={type + ':' + result.slug}>
                  <Link href={searchResultHref(result, language)} className="group block py-6">
                    <h3 className="text-heading group-hover:text-primary text-xl font-semibold">
                      {result.title}
                    </h3>
                    {safeSearchExcerpt(result.summary) && (
                      <p className="text-foreground mt-2 leading-7">
                        {safeSearchExcerpt(result.summary)}
                      </p>
                    )}
                    <span className="text-primary mt-3 inline-block font-semibold">
                      {language === 'am' ? 'ይክፈቱ' : 'Open result'} &rarr;
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function groupLabel(type: SearchResultType, language: Language) {
  if (language === 'am') {
    return type === 'page' ? 'ገጾች' : type === 'event' ? 'ዝግጅቶች' : 'ጽሑፎች';
  }
  return type === 'page' ? 'Pages' : type === 'event' ? 'Events' : 'Blog posts';
}
