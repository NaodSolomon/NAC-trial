'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilePlus2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { getApiErrorMessage, isApiRequestError } from '@/lib/api/errors';
import { listAdminCmsPages } from '../admin-cms.client';
import type { AdminCmsPage, CmsStatus } from '../admin-cms.schemas';
import { CmsStatusBadge } from './CmsStatusBadge';

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; pages: AdminCmsPage[]; totalPages: number; total: number }
  | { status: 'forbidden' }
  | { status: 'error'; message: string };

export function CmsAdminList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = positiveInteger(searchParams.get('page'));
  const language = parseLanguage(searchParams.get('language'));
  const cmsStatus = parseStatus(searchParams.get('status'));
  const [state, setState] = useState<ListState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    void listAdminCmsPages({
      page,
      languageCode: language,
      status: cmsStatus,
      signal: controller.signal,
    })
      .then((result) =>
        setState({
          status: 'ready',
          pages: result.data,
          totalPages: result.meta.totalPages,
          total: result.meta.total,
        }),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState(
          isApiRequestError(error) && error.status === 403
            ? { status: 'forbidden' }
            : { status: 'error', message: getApiErrorMessage(error) },
        );
      });
    return () => controller.abort();
  }, [cmsStatus, language, page]);

  function setFilter(name: 'language' | 'status', value: string) {
    const query = new URLSearchParams(searchParams.toString());
    if (value === 'all') query.delete(name);
    else query.set(name, value);
    query.delete('page');
    router.push(`/admin/content?${query}`);
  }

  function setPage(next: number) {
    const query = new URLSearchParams(searchParams.toString());
    if (next <= 1) query.delete('page');
    else query.set('page', String(next));
    router.push(`/admin/content?${query}`);
  }

  if (state.status === 'forbidden') return <AdminAccessDenied />;
  return (
    <section aria-labelledby="content-heading">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">Content</p>
          <h1
            id="content-heading"
            className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
          >
            CMS pages
          </h1>
          <p className="text-foreground mt-2">
            Create drafts, publish immediately, or schedule future publication.
          </p>
        </div>
        <Button asChild className="min-h-11">
          <Link href="/admin/content/new">
            <FilePlus2 aria-hidden="true" /> Create page
          </Link>
        </Button>
      </div>

      <div className="bg-card mt-8 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
        <Filter
          label="Language"
          value={language}
          onChange={(value) => setFilter('language', value)}
          options={[
            ['all', 'All languages'],
            ['en', 'English'],
            ['am', 'Amharic'],
          ]}
        />
        <Filter
          label="Status"
          value={cmsStatus}
          onChange={(value) => setFilter('status', value)}
          options={[
            ['all', 'All statuses'],
            ['DRAFT', 'Draft'],
            ['SCHEDULED', 'Scheduled'],
            ['PUBLISHED', 'Published'],
          ]}
        />
      </div>

      {state.status === 'loading' && (
        <div
          role="status"
          className="bg-card mt-6 h-64 animate-pulse rounded-xl border motion-reduce:animate-none"
          aria-label="Loading CMS pages"
        />
      )}
      {state.status === 'error' && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-red-300 bg-red-50 p-5 text-red-900"
        >
          {state.message}
        </p>
      )}
      {state.status === 'ready' && (
        <>
          <p className="text-foreground mt-6 text-sm">
            {state.total} page{state.total === 1 ? '' : 's'}
          </p>
          {state.pages.length ? (
            <div className="mt-3 overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[48rem] border-collapse bg-white text-left">
                <thead className="bg-slate-50 text-sm">
                  <tr>
                    <th className="p-4">Page</th>
                    <th className="p-4">Language</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Publication</th>
                    <th className="p-4">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.pages.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-4">
                        <span className="text-heading block font-semibold">{item.title}</span>
                        <span className="text-foreground text-sm">/{item.slug}</span>
                      </td>
                      <td className="p-4">{item.languageCode === 'en' ? 'English' : 'Amharic'}</td>
                      <td className="p-4">
                        <CmsStatusBadge status={item.status} />
                      </td>
                      <td className="text-foreground p-4 text-sm">{publicationLabel(item)}</td>
                      <td className="p-4 text-right">
                        <Button asChild variant="outline" className="min-h-11">
                          <Link href={`/admin/content/${item.id}`}>
                            <Pencil aria-hidden="true" /> Edit
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p role="status" className="bg-card mt-4 rounded-xl border p-8 text-center">
              No CMS pages match these filters.
            </p>
          )}
          <nav aria-label="CMS pagination" className="mt-6 flex items-center justify-between gap-4">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {Math.max(state.totalPages, 1)}
            </span>
            <Button
              variant="outline"
              disabled={page >= state.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </nav>
        </>
      )}
    </section>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="text-heading mb-2 block text-sm font-semibold">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border bg-white px-3"
      >
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function publicationLabel(page: AdminCmsPage) {
  if (page.status === 'SCHEDULED' && page.scheduledAt)
    return `Scheduled ${new Date(page.scheduledAt).toLocaleString()}`;
  if (page.status === 'PUBLISHED' && page.publishedAt)
    return `Published ${new Date(page.publishedAt).toLocaleString()}`;
  return `Updated ${new Date(page.updatedAt).toLocaleDateString()}`;
}

function positiveInteger(value: string | null) {
  return value && /^[1-9]\d*$/.test(value) ? Number(value) : 1;
}
function parseLanguage(value: string | null): 'en' | 'am' | 'all' {
  return value === 'en' || value === 'am' ? value : 'all';
}
function parseStatus(value: string | null): CmsStatus | 'all' {
  return value === 'DRAFT' || value === 'SCHEDULED' || value === 'PUBLISHED' ? value : 'all';
}
