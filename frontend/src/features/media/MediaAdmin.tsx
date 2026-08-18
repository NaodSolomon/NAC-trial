'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, FileUp, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AdminFormField,
  AdminFormSelect,
  AdminFormTextarea,
} from '@/components/admin/AdminFormField';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { UploadProgress } from '@/components/admin/UploadProgress';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { useAuthStore } from '@/store/auth.store';
import { useAdminList } from '@/hooks/use-admin-list';
import { deleteMedia, listMedia, uploadMedia } from './media-admin.client';
import {
  allowedMediaMimeTypes,
  mediaUploadHint,
  mediaUploadSchema,
  type MediaAsset,
  type MediaUploadValues,
} from './media-admin.schemas';

const emptyUpload = {
  languageCode: 'en',
  altText: '',
  caption: '',
} as unknown as MediaUploadValues;

export function MediaAdmin() {
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [progress, setProgress] = useState(0);
  const role = useAuthStore((state) => state.user?.role);
  const { notify } = useAdminFeedback();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MediaUploadValues>({
    resolver: zodResolver(mediaUploadSchema),
    defaultValues: emptyUpload,
  });

  const [fileFieldKey, setFileFieldKey] = useState(0);

  const {
    records: items,
    page,
    setPage,
    pages,
    loading,
    error,
    setError,
    reload: load,
  } = useAdminList<MediaAsset>(
    useCallback(
      ({ page, signal }) => listMedia({ page, type, search: appliedSearch, signal }),
      [type, appliedSearch],
    ),
  );

  async function submitUpload(values: MediaUploadValues) {
    const chosen = values.file[0];
    const form = new FormData();
    form.set('file', chosen);
    form.set('languageCode', values.languageCode);
    if (values.altText.trim()) form.set('altText', values.altText.trim());
    if (values.caption.trim()) form.set('caption', values.caption.trim());
    form.set('folder', 'media');
    setProgress(0);
    setError('');
    try {
      await uploadMedia(form, setProgress);
      reset(emptyUpload);
      // reset() cannot clear a file input, so the control is remounted instead.
      // Otherwise the filename lingers and invites a second upload of a released file.
      setFileFieldKey((value) => value + 1);
      await load();
      notify({ title: 'Media uploaded', message: chosen.name });
    } catch (uploadError) {
      setError(getApiErrorMessageWithDetails(uploadError));
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
        noValidate
        aria-label="Upload media"
        className="bg-card mt-8 grid gap-4 rounded-xl border p-6 shadow-sm lg:grid-cols-2"
        onSubmit={handleSubmit(submitUpload)}
      >
        <div className="lg:col-span-2">
          <AdminFormField
            label="File"
            id="media-file"
            type="file"
            accept={allowedMediaMimeTypes.join(',')}
            className="border-input min-h-12 w-full rounded-lg border bg-white p-2"
            hint={mediaUploadHint}
            error={errors.file?.message}
            key={fileFieldKey}
            {...register('file')}
          />
        </div>
        <AdminFormSelect
          label="Language"
          id="media-language"
          error={errors.languageCode?.message}
          {...register('languageCode')}
        >
          <option value="en">English</option>
          <option value="am">Amharic</option>
        </AdminFormSelect>
        <AdminFormField
          label="Alternative text"
          id="media-alt-text"
          maxLength={500}
          hint="Required for images. Describe what the image shows."
          error={errors.altText?.message}
          {...register('altText')}
        />
        <div className="lg:col-span-2">
          <AdminFormTextarea
            label="Caption"
            id="media-caption"
            rows={3}
            maxLength={1000}
            error={errors.caption?.message}
            {...register('caption')}
          />
        </div>
        <div className="lg:col-span-2">
          <Button type="submit" disabled={isSubmitting}>
            <FileUp aria-hidden="true" />
            {isSubmitting ? 'Uploading…' : 'Upload media'}
          </Button>
          {isSubmitting && <UploadProgress value={progress} />}
        </div>
      </form>
      <form
        aria-label="Filter media"
        className="mt-8 flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setAppliedSearch(search.trim());
        }}
      >
        <select
          aria-label="Filter by media type"
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
        <input
          aria-label="Search media"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search filenames"
          className="min-h-11 rounded-lg border px-3"
        />
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
        <div
          role="status"
          aria-label="Loading media"
          className="bg-card mt-6 h-48 animate-pulse rounded-xl border motion-reduce:animate-none"
        />
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
                  description={`${item.originalName} and its metadata will be permanently removed. Gallery-linked media may not be safe to delete independently.`}
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
      <nav aria-label="Media pagination" className="mt-6 flex items-center justify-between">
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
      </nav>
    </section>
  );
}

function formatBytes(value: number) {
  return value < 1_048_576
    ? `${Math.ceil(value / 1024)} KB`
    : `${(value / 1_048_576).toFixed(1)} MB`;
}
