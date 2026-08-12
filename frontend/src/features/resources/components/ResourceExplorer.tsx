'use client';

import { useMemo, useRef, useState } from 'react';
import { Download, FileText, Search } from 'lucide-react';
import { browserApiClient } from '@/lib/api/browser-client';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Language } from '@/lib/i18n';
import { resourceDownloadSchema } from '../resource.schemas';
import type { PublicResource } from '../resource.types';

type ResourceCategory = 'all' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'text';

const categories: Array<{ value: ResourceCategory; en: string; am: string }> = [
  { value: 'all', en: 'All resources', am: 'ሁሉም ግብዓቶች' },
  { value: 'pdf', en: 'PDF', am: 'PDF' },
  { value: 'document', en: 'Documents', am: 'ሰነዶች' },
  { value: 'spreadsheet', en: 'Spreadsheets', am: 'ሰንጠረዦች' },
  { value: 'presentation', en: 'Presentations', am: 'ማቅረቢያዎች' },
  { value: 'text', en: 'Text and CSV', am: 'ጽሑፍ እና CSV' },
];

export function ResourceExplorer({
  initialResources,
  language,
}: {
  initialResources: PublicResource[];
  language: Language;
}) {
  const [resources, setResources] = useState(initialResources);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ResourceCategory>('all');
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(new Set<string>());

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return resources.filter((resource) => {
      const matchesCategory = category === 'all' || categoryFor(resource.mimeType) === category;
      const matchesTerm =
        !term ||
        `${resource.title} ${resource.description} ${resource.fileName}`
          .toLocaleLowerCase()
          .includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [category, query, resources]);

  async function download(resource: PublicResource) {
    if (inFlight.current.has(resource.id)) return;
    inFlight.current.add(resource.id);
    setPendingIds((current) => new Set(current).add(resource.id));
    setError(null);
    try {
      const response = await browserApiClient.get(
        `/public/resources/${resource.id}/download`,
      );
      const result = resourceDownloadSchema.parse(response);
      setResources((current) =>
        current.map((item) =>
          item.id === result.id ? { ...item, downloadCount: result.downloadCount } : item,
        ),
      );
      triggerResourceDownload(result.fileUrl, result.fileName);
    } catch (downloadError) {
      setError(getApiErrorMessage(downloadError));
    } finally {
      inFlight.current.delete(resource.id);
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(resource.id);
        return next;
      });
    }
  }

  if (!resources.length) return <ResourceEmptyState language={language} />;

  return (
    <div>
      <div className="mb-10 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="block">
          <span className="text-heading mb-2 block font-semibold">
            {language === 'am' ? 'ግብዓት ይፈልጉ' : 'Search resources'}
          </span>
          <span className="relative block">
            <Search
              aria-hidden="true"
              className="text-foreground absolute top-1/2 left-4 size-5 -translate-y-1/2"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="border-input min-h-12 w-full rounded-lg border bg-white pr-4 pl-12"
              placeholder={language === 'am' ? 'ርዕስ ወይም ፋይል' : 'Title, description, or file name'}
            />
          </span>
        </label>
        <div
          role="group"
          aria-label={language === 'am' ? 'የግብዓት ዓይነት' : 'Resource type'}
          className="flex max-w-full gap-2 overflow-x-auto pb-1"
        >
          {categories.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={category === item.value}
              onClick={() => setCategory(item.value)}
              className={
                category === item.value
                  ? 'bg-primary min-h-11 shrink-0 rounded-full px-4 font-semibold text-white'
                  : 'bg-secondary-bg text-heading min-h-11 shrink-0 rounded-full border px-4 font-semibold'
              }
            >
              {item[language]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive mb-6 rounded-lg border p-4"
        >
          {error}
        </p>
      )}
      {filtered.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource) => (
            <article
              key={resource.id}
              className="bg-card flex flex-col rounded-xl border p-6 shadow-sm"
            >
              <FileText aria-hidden="true" className="text-primary size-10" />
              <h2 className="text-heading mt-5 text-xl font-semibold">{resource.title}</h2>
              <p className="text-foreground mt-3 flex-1 leading-7">{resource.description}</p>
              <p className="text-foreground mt-4 text-sm">
                {resource.fileName} · {labelForMime(resource.mimeType)}
              </p>
              <button
                type="button"
                disabled={pendingIds.has(resource.id)}
                onClick={() => void download(resource)}
                className="bg-primary hover:bg-primary-hover mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded px-5 font-semibold text-white disabled:cursor-wait disabled:opacity-70"
              >
                <Download aria-hidden="true" className="size-5" />
                {pendingIds.has(resource.id)
                  ? language === 'am'
                    ? 'በማዘጋጀት ላይ…'
                    : 'Preparing…'
                  : language === 'am'
                    ? 'አውርድ'
                    : 'Download'}
              </button>
              <span aria-live="polite" className="text-foreground mt-2 text-center text-xs">
                {resource.downloadCount} {language === 'am' ? 'ውርዶች' : 'downloads'}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <div role="status" className="bg-secondary-bg rounded-xl border p-10 text-center">
          <h2 className="text-heading text-2xl font-semibold">
            {language === 'am' ? 'ተዛማጅ ግብዓት አልተገኘም' : 'No matching resources'}
          </h2>
          <p className="text-foreground mt-2">
            {language === 'am' ? 'ሌላ ፍለጋ ወይም ዓይነት ይሞክሩ።' : 'Try another search or resource type.'}
          </p>
        </div>
      )}
    </div>
  );
}

function ResourceEmptyState({ language }: { language: Language }) {
  return (
    <div role="status" className="bg-secondary-bg rounded-xl border p-12 text-center">
      <FileText aria-hidden="true" className="text-primary mx-auto size-12" />
      <h2 className="text-heading mt-5 text-2xl font-semibold">
        {language === 'am' ? 'ግብዓቶች በቅርቡ ይታከላሉ' : 'Resources will be added soon'}
      </h2>
      <p className="text-foreground mt-2">
        {language === 'am'
          ? 'አዲስ የቤተሰብ መረጃ ለማግኘት ደግመው ይጎብኙ።'
          : 'Check back for new family information and downloads.'}
      </p>
    </div>
  );
}

function categoryFor(mimeType: string): ResourceCategory {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType === 'application/msword') return 'document';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
  return 'text';
}

function labelForMime(mimeType: string) {
  return categories.find((item) => item.value === categoryFor(mimeType))?.en ?? 'File';
}

export function triggerResourceDownload(fileUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName;
  link.rel = 'noopener noreferrer';
  link.target = '_blank';
  document.body.append(link);
  link.click();
  link.remove();
}
