'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { FileUp, Save, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { UploadProgress } from '@/components/admin/UploadProgress';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuthStore } from '@/store/auth.store';
import type { GalleryApiItem } from './gallery.schemas';
import {
  deleteGallery,
  listAdminGallery,
  updateGallery,
  uploadGallery,
} from './gallery-admin.client';

const galleryMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
];

export function GalleryAdmin() {
  const [language, setLanguage] = useState<'en' | 'am'>('en');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [items, setItems] = useState<GalleryApiItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { title: string; altText: string }>>({});
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const role = useAuthStore((state) => state.user?.role);
  const queryClient = useQueryClient();
  const { notify } = useAdminFeedback();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const result = await listAdminGallery({ page, languageCode: language, type, signal });
        setItems(result.data);
        setPages(Math.max(1, result.meta.totalPages));
        setDrafts(
          Object.fromEntries(
            result.data.map((item) => [item.id, { title: item.title, altText: item.altText }]),
          ),
        );
      } catch (loadError) {
        if (!signal?.aborted) setError(getApiErrorMessageWithDetails(loadError));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, language, type],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.gallery.all });
    await load();
  }
  async function upload() {
    if (!file) return setError('Choose an image or video.');
    if (file.size > 10_485_760) return setError('The gallery file must be 10 MB or smaller.');
    if (!galleryMimeTypes.includes(file.type))
      return setError('Gallery accepts JPEG, PNG, GIF, WebP, MP4, and WebM files.');
    if (title.trim().length < 2 || altText.trim().length < 2)
      return setError('Title and alternative text must contain at least two characters.');
    const form = new FormData();
    form.set('file', file);
    form.set('title', title.trim());
    form.set('altText', altText.trim());
    form.set('languageCode', language);
    setUploading(true);
    setProgress(0);
    setError('');
    try {
      await uploadGallery(form, setProgress);
      setFile(null);
      setTitle('');
      setAltText('');
      await refresh();
      notify({ title: 'Gallery item uploaded', message: title });
    } catch (uploadError) {
      setError(getApiErrorMessageWithDetails(uploadError));
    } finally {
      setUploading(false);
    }
  }
  async function save(item: GalleryApiItem) {
    const values = drafts[item.id];
    if (!values || values.title.trim().length < 2 || values.altText.trim().length < 2)
      return setError('Title and alternative text must contain at least two characters.');
    try {
      await updateGallery(item.id, values);
      await refresh();
      notify({ title: 'Gallery item saved', message: values.title });
    } catch (saveError) {
      setError(getApiErrorMessageWithDetails(saveError));
    }
  }
  async function remove(item: GalleryApiItem) {
    await deleteGallery(item.id);
    await refresh();
    notify({ title: 'Gallery item deleted', message: item.title });
  }

  return (
    <section aria-labelledby="gallery-admin-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">
        Public collection
      </p>
      <h1
        id="gallery-admin-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        Gallery
      </h1>
      <p className="text-foreground mt-2">
        Upload and maintain localized image and video presentation.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <div
          role="tablist"
          aria-label="Gallery language"
          className="inline-flex rounded-lg border bg-white p-1"
        >
          {(['en', 'am'] as const).map((code) => (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={language === code}
              onClick={() => {
                setLanguage(code);
                setPage(1);
              }}
              className={`min-h-11 rounded-md px-5 font-semibold ${language === code ? 'bg-primary text-white' : ''}`}
            >
              {code === 'en' ? 'English' : 'Amharic'}
            </button>
          ))}
        </div>
        <select
          aria-label="Gallery type"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
          className="min-h-11 rounded-lg border bg-white px-3"
        >
          <option value="">Images and videos</option>
          <option value="IMAGE">Images</option>
          <option value="VIDEO">Videos</option>
        </select>
      </div>
      <form
        className="bg-card mt-6 grid gap-4 rounded-xl border p-6 shadow-sm md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void upload();
        }}
      >
        <label className="md:col-span-2">
          <span className="text-heading mb-2 block text-sm font-semibold">Image or video</span>
          <input
            type="file"
            accept={galleryMimeTypes.join(',')}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="min-h-11 w-full rounded-lg border p-2"
          />
        </label>
        <Field label="Title" value={title} maxLength={255} onChange={setTitle} />
        <Field label="Alternative text" value={altText} maxLength={500} onChange={setAltText} />
        <div className="md:col-span-2">
          <Button type="submit" disabled={uploading}>
            <FileUp aria-hidden="true" />
            {uploading ? 'Uploading…' : 'Upload gallery item'}
          </Button>
          {uploading && <UploadProgress value={progress} />}
        </div>
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
        <div role="status" className="bg-card mt-6 h-52 animate-pulse rounded-xl border" />
      ) : items.length === 0 ? (
        <p role="status" className="bg-card mt-6 rounded-xl border p-8">
          No {language.toUpperCase()} gallery items match this filter.
        </p>
      ) : (
        <ul className="mt-6 grid gap-5 xl:grid-cols-2">
          {items.map((item) => {
            const draft = drafts[item.id] ?? { title: item.title, altText: item.altText };
            return (
              <li key={item.id} className="bg-card rounded-xl border p-5 shadow-sm">
                <div className="relative mb-4 aspect-video overflow-hidden rounded-lg bg-slate-100">
                  {item.type === 'IMAGE' ? (
                    <Image
                      src={item.mediaUrl}
                      alt={item.altText}
                      fill
                      sizes="(max-width: 1280px) 100vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <video src={item.mediaUrl} controls preload="metadata" className="size-full" />
                  )}
                </div>
                <div className="grid gap-4">
                  <Field
                    label="Title"
                    value={draft.title}
                    maxLength={255}
                    onChange={(value) =>
                      setDrafts({ ...drafts, [item.id]: { ...draft, title: value } })
                    }
                  />
                  <Field
                    label="Alternative text"
                    value={draft.altText}
                    maxLength={500}
                    onChange={(value) =>
                      setDrafts({ ...drafts, [item.id]: { ...draft, altText: value } })
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void save(item)}>
                      <Save aria-hidden="true" /> Save
                    </Button>
                    {role === 'SUPER_ADMIN' && (
                      <ConfirmedActionButton
                        title="Delete gallery item?"
                        description="The gallery record and its stored media object will be permanently removed."
                        confirmLabel="Delete gallery item"
                        onConfirm={() => remove(item)}
                      >
                        <Trash2 aria-hidden="true" /> Delete
                      </ConfirmedActionButton>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
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
