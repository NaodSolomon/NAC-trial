'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { CmsStatusBadge } from '@/features/cms/components/CmsStatusBadge';
import { listAdminCmsPages } from '@/features/cms/admin-cms.client';
import type { AdminCmsPage } from '@/features/cms/admin-cms.schemas';
import { getApiErrorMessage, isApiRequestError } from '@/lib/api/errors';
import { updateSeoMetadata } from './seo.client';
import { seoEditorSchema, type SeoEditorValues } from './seo.schemas';

export function SeoAdmin() {
  const { notify } = useAdminFeedback();
  const [pages, setPages] = useState<AdminCmsPage[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [values, setValues] = useState<SeoEditorValues>({
    languageCode: 'en',
    title: '',
    description: '',
    keywordsText: '',
    imageUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const selected = useMemo(
    () => pages.find((page) => page.id === selectedId) ?? null,
    [pages, selectedId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void listAdminCmsPages({ page: 1, limit: 100, signal: controller.signal })
      .then((result) => {
        setPages(result.data);
        if (result.data[0]) selectPage(result.data[0]);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        if (isApiRequestError(loadError) && loadError.status === 403) setForbidden(true);
        else setError(getApiErrorMessage(loadError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  function selectPage(page: AdminCmsPage) {
    setSelectedId(page.id);
    setValues({
      languageCode: page.languageCode,
      title: page.seoTitle ?? '',
      description: page.seoDescription ?? '',
      keywordsText: page.seoKeywords.join(', '),
      imageUrl: page.seoImageUrl ?? '',
    });
    setError('');
  }

  async function save() {
    if (!selected) return;
    const parsed = seoEditorSchema.safeParse(values);
    if (!parsed.success) {
      setError([...new Set(parsed.error.issues.map((issue) => issue.message))].join(' '));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await updateSeoMetadata(selected.slug, parsed.data);
      setPages((current) =>
        current.map((page) =>
          page.id === selected.id
            ? {
                ...page,
                seoTitle: parsed.data.title || null,
                seoDescription: parsed.data.description || null,
                seoKeywords: updated.keywords,
                seoImageUrl: updated.imageUrl,
              }
            : page,
        ),
      );
      notify({
        title: 'SEO metadata saved',
        message: `${updated.slug} (${updated.languageCode}) was updated.`,
      });
    } catch (saveError) {
      setError(`${getApiErrorMessage(saveError)} Your unsaved SEO fields remain unchanged.`);
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) return <AdminAccessDenied />;
  return (
    <section aria-labelledby="seo-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">
        Search presentation
      </p>
      <h1
        id="seo-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        SEO metadata
      </h1>
      <p className="text-foreground mt-2 max-w-2xl">
        Manage localized search titles, descriptions, keywords, and social preview images without
        duplicating CMS content.
      </p>
      {loading ? (
        <div
          role="status"
          aria-label="Loading SEO pages"
          className="bg-card mt-8 h-64 animate-pulse rounded-xl border motion-reduce:animate-none"
        />
      ) : pages.length === 0 ? (
        <p role="status" className="bg-card mt-8 rounded-xl border p-8">
          Create a CMS page before adding SEO metadata.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <form
            className="bg-card space-y-6 rounded-xl border p-6 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
            noValidate
          >
            <label className="block">
              <span className="text-heading mb-2 block text-sm font-semibold">CMS page</span>
              <select
                value={selectedId}
                onChange={(event) => {
                  const page = pages.find((item) => item.id === event.target.value);
                  if (page) selectPage(page);
                }}
                className="min-h-11 w-full rounded-lg border bg-white px-3"
              >
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title} — {page.languageCode.toUpperCase()} — {page.status}
                  </option>
                ))}
              </select>
            </label>
            {selected && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-4">
                <CmsStatusBadge status={selected.status} />
                <span className="text-sm">/{selected.slug}</span>
                {selected.status !== 'PUBLISHED' && (
                  <span className="text-sm font-medium text-amber-800">
                    Draft SEO remains private until this page is published.
                  </span>
                )}
              </div>
            )}
            <SeoField
              label="SEO title"
              value={values.title}
              maxLength={70}
              onChange={(title) => setValues({ ...values, title })}
            />
            <SeoTextarea
              label="SEO description"
              value={values.description}
              maxLength={160}
              rows={4}
              onChange={(description) => setValues({ ...values, description })}
            />
            <SeoTextarea
              label="Keywords (comma separated, maximum 10)"
              value={values.keywordsText}
              maxLength={500}
              rows={3}
              onChange={(keywordsText) => setValues({ ...values, keywordsText })}
            />
            <SeoField
              label="Social image URL"
              value={values.imageUrl}
              maxLength={2_048}
              onChange={(imageUrl) => setValues({ ...values, imageUrl })}
            />
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900"
              >
                {error}
              </p>
            )}
            <Button type="submit" disabled={saving}>
              <Save aria-hidden="true" /> {saving ? 'Saving…' : 'Save SEO metadata'}
            </Button>
          </form>
          <aside
            aria-label="Search result preview"
            className="bg-card h-fit rounded-xl border p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 text-sm">
              <Search aria-hidden="true" className="size-4" /> Search preview
            </div>
            <p className="mt-5 text-xl text-blue-800">
              {values.title || selected?.title || 'Page title fallback'}
            </p>
            <p className="mt-1 text-sm text-green-800">nehemiah.example/{selected?.slug}</p>
            <p className="text-foreground mt-2 text-sm">
              {values.description || 'No search description has been configured.'}
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}

function SeoField({
  label,
  value,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-heading mb-2 flex justify-between gap-3 text-sm font-semibold">
        <span>{label}</span>
        <span className="text-foreground font-normal">
          {value.length}/{maxLength}
        </span>
      </span>
      <input
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border px-3"
      />
    </label>
  );
}
function SeoTextarea({
  label,
  value,
  maxLength,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  maxLength: number;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-heading mb-2 flex justify-between gap-3 text-sm font-semibold">
        <span>{label}</span>
        <span className="text-foreground font-normal">
          {value.length}/{maxLength}
        </span>
      </span>
      <textarea
        value={value}
        maxLength={maxLength}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border p-3"
      />
    </label>
  );
}
