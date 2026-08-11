'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FilePlus2, Send, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuthStore } from '@/store/auth.store';
import {
  createResource,
  deleteResource,
  listAdminResources,
  publishResource,
} from './resource-admin.client';
import {
  emptyResource,
  resourceEditorSchema,
  resourceMimeTypes,
  type AdminResource,
  type ResourceEditorValues,
} from './resource-admin.schemas';

export function ResourceAdmin() {
  const [items, setItems] = useState<AdminResource[]>([]);
  const [values, setValues] = useState<ResourceEditorValues>(emptyResource);
  const [language, setLanguage] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const role = useAuthStore((state) => state.user?.role);
  const queryClient = useQueryClient();
  const { notify } = useAdminFeedback();
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const result = await listAdminResources({ page, languageCode: language, signal });
        setItems(result.data);
        setPages(Math.max(1, result.meta.totalPages));
      } catch (loadError) {
        if (!signal?.aborted) setError(getApiErrorMessageWithDetails(loadError));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, language],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
    await load();
  }
  async function create() {
    const parsed = resourceEditorSchema.safeParse(values);
    if (!parsed.success)
      return setError([...new Set(parsed.error.issues.map((issue) => issue.message))].join(' '));
    setSaving(true);
    setError('');
    try {
      const created = await createResource(parsed.data);
      setValues({ ...emptyResource, languageCode: parsed.data.languageCode });
      await refresh();
      notify({ title: 'Resource draft created', message: created.title });
    } catch (createError) {
      setError(
        `${getApiErrorMessageWithDetails(createError)} Your resource details remain in the form.`,
      );
    } finally {
      setSaving(false);
    }
  }
  async function publish(item: AdminResource) {
    await publishResource(item.id);
    await refresh();
    notify({ title: 'Resource published', message: item.title });
  }
  async function remove(item: AdminResource) {
    await deleteResource(item.id);
    await refresh();
    notify({ title: 'Resource deleted', message: item.title });
  }
  return (
    <section aria-labelledby="resources-admin-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">Download library</p>
      <h1
        id="resources-admin-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        Resources
      </h1>
      <p className="text-foreground mt-2 max-w-2xl">
        Create resource drafts from files uploaded to approved storage, then publish them
        explicitly.
      </p>
      <form
        className="bg-card mt-8 grid gap-4 rounded-xl border p-6 shadow-sm md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-950 md:col-span-2">
          Upload documents in the{' '}
          <Link href="/admin/media" className="font-semibold underline">
            media library
          </Link>
          , then paste the resulting approved public URL here.
        </div>
        <Field
          label="Title"
          value={values.title}
          maxLength={255}
          onChange={(title) => setValues({ ...values, title })}
        />
        <Field
          label="File name"
          value={values.fileName}
          maxLength={255}
          onChange={(fileName) => setValues({ ...values, fileName })}
        />
        <label className="md:col-span-2">
          <span className="text-heading mb-2 block text-sm font-semibold">Approved file URL</span>
          <input
            type="url"
            value={values.fileUrl}
            maxLength={2048}
            onChange={(event) => setValues({ ...values, fileUrl: event.target.value })}
            className="min-h-11 w-full rounded-lg border px-3"
          />
        </label>
        <label>
          <span className="text-heading mb-2 block text-sm font-semibold">MIME type</span>
          <select
            value={values.mimeType}
            onChange={(event) =>
              setValues({
                ...values,
                mimeType: event.target.value as ResourceEditorValues['mimeType'],
              })
            }
            className="min-h-11 w-full rounded-lg border bg-white px-3"
          >
            {resourceMimeTypes.map((mime) => (
              <option key={mime}>{mime}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-heading mb-2 block text-sm font-semibold">Language</span>
          <select
            value={values.languageCode}
            onChange={(event) =>
              setValues({ ...values, languageCode: event.target.value as 'en' | 'am' })
            }
            className="min-h-11 w-full rounded-lg border bg-white px-3"
          >
            <option value="en">English</option>
            <option value="am">Amharic</option>
          </select>
        </label>
        <label className="md:col-span-2">
          <span className="text-heading mb-2 block text-sm font-semibold">Description</span>
          <textarea
            value={values.description}
            maxLength={2000}
            rows={5}
            onChange={(event) => setValues({ ...values, description: event.target.value })}
            className="w-full rounded-lg border p-3"
          />
        </label>
        <div className="md:col-span-2">
          <Button type="submit" disabled={saving}>
            <FilePlus2 aria-hidden="true" />
            {saving ? 'Creating…' : 'Create resource draft'}
          </Button>
        </div>
      </form>
      <div className="mt-8 flex justify-end">
        <select
          aria-label="Resource language"
          value={language}
          onChange={(event) => {
            setLanguage(event.target.value);
            setPage(1);
          }}
          className="min-h-11 rounded-lg border bg-white px-3"
        >
          <option value="">All languages</option>
          <option value="en">English</option>
          <option value="am">Amharic</option>
        </select>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900"
        >
          {error}
        </p>
      )}
      {loading ? (
        <div role="status" className="bg-card mt-6 h-52 animate-pulse rounded-xl border" />
      ) : items.length === 0 ? (
        <p role="status" className="bg-card mt-6 rounded-xl border p-8">
          No resources match this language.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="bg-card rounded-xl border p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <AdminStatusBadge status={item.status} />
                  <h2 className="text-heading mt-3 text-lg font-semibold">{item.title}</h2>
                  <p className="text-foreground mt-1 text-sm">
                    {item.languageCode.toUpperCase()} · {item.fileName}
                  </p>
                </div>
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${item.fileName}`}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-md border"
                >
                  <ExternalLink aria-hidden="true" className="size-4" />
                </a>
              </div>
              <p className="mt-3 text-sm">{item.description}</p>
              <p className="text-foreground mt-3 text-xs">{item.downloadCount} tracked downloads</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.status === 'DRAFT' && (
                  <Button type="button" onClick={() => void publish(item)}>
                    <Send aria-hidden="true" /> Publish
                  </Button>
                )}
                {role === 'SUPER_ADMIN' && (
                  <ConfirmedActionButton
                    title="Delete resource?"
                    description="The resource record will be removed. The underlying media object remains in the media library."
                    confirmLabel="Delete resource"
                    onConfirm={() => remove(item)}
                  >
                    <Trash2 aria-hidden="true" /> Delete
                  </ConfirmedActionButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {page} of {pages}
        </span>
        <Button
          variant="outline"
          disabled={page >= pages}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </Button>
      </div>
    </section>
  );
}
function Field({
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
    <label>
      <span className="text-heading mb-2 block text-sm font-semibold">{label}</span>
      <input
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border px-3"
      />
    </label>
  );
}
