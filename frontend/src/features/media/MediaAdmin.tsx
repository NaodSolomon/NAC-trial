'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileUp, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { UploadProgress } from '@/components/admin/UploadProgress';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { useAuthStore } from '@/store/auth.store';
import { deleteMedia, listMedia, uploadMedia } from './media-admin.client';
import { validateMediaFile, type MediaAsset } from './media-admin.schemas';

export function MediaAdmin() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [languageCode, setLanguageCode] = useState<'en' | 'am'>('en');
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const role = useAuthStore((state) => state.user?.role);
  const { notify } = useAdminFeedback();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const result = await listMedia({ page, type, search: appliedSearch, signal });
        setItems(result.data);
        setPages(Math.max(1, result.meta.totalPages));
      } catch (loadError) {
        if (!signal?.aborted) setError(getApiErrorMessageWithDetails(loadError));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, type, appliedSearch],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function submitUpload() {
    const fileError = validateMediaFile(file);
    if (fileError) return setError(fileError);
    if (file!.type.startsWith('image/') && !altText.trim())
      return setError('Alternative text is required for images.');
    if (altText.length > 500 || caption.length > 1000)
      return setError('Alternative text or caption exceeds the allowed length.');
    const form = new FormData();
    form.set('file', file!);
    form.set('languageCode', languageCode);
    if (altText.trim()) form.set('altText', altText.trim());
    if (caption.trim()) form.set('caption', caption.trim());
    form.set('folder', 'media');
    setUploading(true);
    setProgress(0);
    setError('');
    try {
      await uploadMedia(form, setProgress);
      setFile(null);
      setAltText('');
      setCaption('');
      await load();
      notify({ title: 'Media uploaded', message: file!.name });
    } catch (uploadError) {
      setError(getApiErrorMessageWithDetails(uploadError));
    } finally {
      setUploading(false);
    }
  }

  async function remove(item: MediaAsset) {
    await deleteMedia(item.id);
    await load();
    notify({ title: 'Media deleted', message: item.originalName });
  }

  return (
    <section aria-labelledby="media-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">Asset library</p>
      <h1
        id="media-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        Media
      </h1>
      <p className="text-foreground mt-2 max-w-2xl">
        Upload validated images, video, and PDF files. Deletion is restricted to super
        administrators.
      </p>
      <form
        className="bg-card mt-8 grid gap-4 rounded-xl border p-6 shadow-sm lg:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submitUpload();
        }}
      >
        <label className="block lg:col-span-2">
          <span className="text-heading mb-2 block text-sm font-semibold">File</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="min-h-11 w-full rounded-lg border p-2"
          />
        </label>
        <label>
          <span className="text-heading mb-2 block text-sm font-semibold">Language</span>
          <select
            value={languageCode}
            onChange={(event) => setLanguageCode(event.target.value as 'en' | 'am')}
            className="min-h-11 w-full rounded-lg border bg-white px-3"
          >
            <option value="en">English</option>
            <option value="am">Amharic</option>
          </select>
        </label>
        <Field label="Alternative text" value={altText} maxLength={500} onChange={setAltText} />
        <label className="lg:col-span-2">
          <span className="text-heading mb-2 block text-sm font-semibold">Caption</span>
          <textarea
            value={caption}
            maxLength={1000}
            rows={3}
            onChange={(event) => setCaption(event.target.value)}
            className="w-full rounded-lg border p-3"
          />
        </label>
        <div className="lg:col-span-2">
          <Button type="submit" disabled={uploading}>
            <FileUp aria-hidden="true" />
            {uploading ? 'Uploading…' : 'Upload media'}
          </Button>
          {uploading && <UploadProgress value={progress} />}
        </div>
      </form>
      <form
        className="mt-8 flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setAppliedSearch(search.trim());
        }}
      >
        <label>
          <span className="sr-only">Media type</span>
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
            className="min-h-11 rounded-lg border bg-white px-3"
          >
            <option value="">All types</option>
            <option value="IMAGE">Images</option>
            <option value="VIDEO">Videos</option>
            <option value="DOCUMENT">Documents</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Search media</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search filenames"
            className="min-h-11 rounded-lg border px-3"
          />
        </label>
        <Button type="submit" variant="outline">
          <Search aria-hidden="true" /> Search
        </Button>
      </form>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900"
        >
          {error}
        </p>
      )}
      {loading ? (
        <div role="status" className="bg-card mt-6 h-48 animate-pulse rounded-xl border" />
      ) : items.length === 0 ? (
        <p role="status" className="bg-card mt-6 rounded-xl border p-8">
          No media matches these filters.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="bg-card rounded-xl border p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-primary text-xs font-semibold">{item.type}</span>
                  <h2 className="text-heading mt-1 font-semibold break-all">{item.originalName}</h2>
                </div>
                <a
                  href={item.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${item.originalName}`}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-md border"
                >
                  <ExternalLink aria-hidden="true" className="size-4" />
                </a>
              </div>
              <p className="text-foreground mt-2 text-sm">
                {formatBytes(item.sizeBytes)} · {item.mimeType}
              </p>
              {item.translations[0]?.altText && (
                <p className="mt-3 text-sm">Alt: {item.translations[0].altText}</p>
              )}
              {role === 'SUPER_ADMIN' && (
                <ConfirmedActionButton
                  className="mt-4"
                  title="Delete media asset?"
                  description="The object and metadata will be permanently removed. Gallery-linked media may not be safe to delete independently."
                  confirmLabel="Delete media"
                  onConfirm={() => remove(item)}
                >
                  <Trash2 aria-hidden="true" /> Delete
                </ConfirmedActionButton>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex items-center justify-between">
        <Button
          type="button"
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
          type="button"
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
function formatBytes(value: number) {
  return value < 1_048_576
    ? `${Math.ceil(value / 1024)} KB`
    : `${(value / 1_048_576).toFixed(1)} MB`;
}
