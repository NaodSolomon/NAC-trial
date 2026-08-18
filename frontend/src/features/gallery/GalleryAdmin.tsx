'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileUp, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminFormField } from '@/components/admin/AdminFormField';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { UploadProgress } from '@/components/admin/UploadProgress';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { useAdminActions } from '@/hooks/use-admin-actions';
import { useAuthStore } from '@/store/auth.store';
import { useAdminList } from '@/hooks/use-admin-list';
import {
  galleryEditorSchema,
  galleryMimeTypes,
  galleryUploadHint,
  galleryUploadSchema,
  type GalleryApiItem,
  type GalleryEditorValues,
  type GalleryUploadValues,
} from './gallery.schemas';
import {
  deleteGallery,
  listAdminGallery,
  updateGallery,
  uploadGallery,
} from './gallery-admin.client';

const emptyUpload = { title: '', altText: '' } as unknown as GalleryUploadValues;

export function GalleryAdmin() {
  const [language, setLanguage] = useState<'en' | 'am'>('en');
  const [type, setType] = useState('');
  const [progress, setProgress] = useState(0);
  const role = useAuthStore((state) => state.user?.role);
  const { notify } = useAdminFeedback();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GalleryUploadValues>({
    resolver: zodResolver(galleryUploadSchema),
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
  } = useAdminList<GalleryApiItem>(
    useCallback(
      ({ page, signal }) => listAdminGallery({ page, languageCode: language, type, signal }),
      [language, type],
    ),
  );

  const { refresh, run } = useAdminActions({
    reload: load,
    queryKey: queryKeys.gallery.all,
  });

  async function upload(values: GalleryUploadValues) {
    const form = new FormData();
    form.set('file', values.file[0]);
    form.set('title', values.title.trim());
    form.set('altText', values.altText.trim());
    form.set('languageCode', language);
    setProgress(0);
    setError('');
    try {
      await uploadGallery(form, setProgress);
      reset(emptyUpload);
      // reset() cannot clear a file input, so the control is remounted instead.
      // Otherwise the filename lingers and invites a second upload of a released file.
      setFileFieldKey((value) => value + 1);
      await refresh();
      notify({ title: 'Gallery item uploaded', message: values.title.trim() });
    } catch (uploadError) {
      setError(getApiErrorMessageWithDetails(uploadError));
    }
  }

  const save = useCallback(
    async (item: GalleryApiItem, values: GalleryEditorValues) => {
      await updateGallery(item.id, values);
      await refresh();
      notify({ title: 'Gallery item saved', message: values.title });
    },
    [notify, refresh],
  );

  const remove = useCallback(
    (item: GalleryApiItem) =>
      run(() => deleteGallery(item.id), {
        title: 'Gallery item deleted',
        message: item.title,
      }),
    [run],
  );

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
          aria-label="Filter by media type"
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
        noValidate
        aria-label="Upload gallery item"
        className="bg-card mt-6 grid gap-4 rounded-xl border p-6 shadow-sm md:grid-cols-2"
        onSubmit={handleSubmit(upload)}
      >
        <div className="md:col-span-2">
          <AdminFormField
            label="Image or video"
            id="gallery-file"
            type="file"
            accept={galleryMimeTypes.join(',')}
            className="border-input min-h-12 w-full rounded-lg border bg-white p-2"
            hint={galleryUploadHint}
            error={errors.file?.message}
            key={fileFieldKey}
            {...register('file')}
          />
        </div>
        <AdminFormField
          label="Title"
          id="gallery-title"
          maxLength={255}
          error={errors.title?.message}
          {...register('title')}
        />
        <AdminFormField
          label="Alternative text"
          id="gallery-alt-text"
          maxLength={500}
          hint="Describe what the image or video shows."
          error={errors.altText?.message}
          {...register('altText')}
        />
        <div className="md:col-span-2">
          <Button type="submit" disabled={isSubmitting}>
            <FileUp aria-hidden="true" />
            {isSubmitting ? 'Uploading…' : 'Upload gallery item'}
          </Button>
          {isSubmitting && <UploadProgress value={progress} />}
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
        <div
          role="status"
          aria-label="Loading gallery"
          className="bg-card mt-6 h-52 animate-pulse rounded-xl border motion-reduce:animate-none"
        />
      ) : error ? null : items.length === 0 ? (
        <AdminEmptyState
          entity={`${language.toUpperCase()} gallery items`}
          filtered={Boolean(type)}
          onClearFilters={() => setType('')}
        />
      ) : (
        <ul className="mt-6 grid gap-5 xl:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <GalleryItemRow
                item={item}
                canDelete={role === 'SUPER_ADMIN'}
                onSave={save}
                onDelete={remove}
              />
            </li>
          ))}
        </ul>
      )}
      <nav aria-label="Gallery pagination" className="mt-6 flex items-center justify-between">
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

function GalleryItemRow({
  item,
  canDelete,
  onSave,
  onDelete,
}: {
  item: GalleryApiItem;
  canDelete: boolean;
  onSave: (item: GalleryApiItem, values: GalleryEditorValues) => Promise<void>;
  onDelete: (item: GalleryApiItem) => Promise<void>;
}) {
  const [rowError, setRowError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GalleryEditorValues>({
    resolver: zodResolver(galleryEditorSchema),
    defaultValues: { title: item.title, altText: item.altText },
  });

  useEffect(() => {
    reset({ title: item.title, altText: item.altText });
  }, [item.title, item.altText, reset]);

  async function submit(values: GalleryEditorValues) {
    setRowError('');
    try {
      await onSave(item, values);
    } catch (saveError) {
      setRowError(`${getApiErrorMessageWithDetails(saveError)} Your edits are still on screen.`);
    }
  }

  return (
    <form
      noValidate
      aria-label={`Edit ${item.title}`}
      onSubmit={handleSubmit(submit)}
      className="bg-card rounded-xl border p-5 shadow-sm"
    >
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
        <AdminFormField
          label="Title"
          id={`gallery-title-${item.id}`}
          maxLength={255}
          error={errors.title?.message}
          {...register('title')}
        />
        <AdminFormField
          label="Alternative text"
          id={`gallery-alt-text-${item.id}`}
          maxLength={500}
          error={errors.altText?.message}
          {...register('altText')}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSubmitting}>
            <Save aria-hidden="true" /> {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
          {canDelete && (
            <ConfirmedActionButton
              title="Delete gallery item?"
              description={`${item.title} and its stored media object will be permanently removed.`}
              confirmLabel="Delete gallery item"
              disabled={isSubmitting}
              onConfirm={() => onDelete(item)}
            >
              <Trash2 aria-hidden="true" /> Delete
            </ConfirmedActionButton>
          )}
        </div>
        {rowError && (
          <p
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900"
          >
            {rowError}
          </p>
        )}
      </div>
    </form>
  );
}
