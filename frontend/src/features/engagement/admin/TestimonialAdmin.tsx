'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FilePlus2, Save, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import {
  AdminFormField,
  AdminFormSelect,
  AdminFormTextarea,
} from '@/components/admin/AdminFormField';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { Button } from '@/components/ui/button';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import {
  createTestimonial,
  deleteTestimonial,
  listAdminTestimonials,
  updateTestimonial,
} from './engagement-admin.client';
import {
  emptyTestimonial,
  testimonialEditorSchema,
  type Testimonial,
  type TestimonialEditorValues,
} from './engagement-admin.schemas';
import { EngagementHeading, LanguageFilter, ListPager, LoadState } from './EngagementAdminParts';

export function TestimonialAdmin() {
  const [records, setRecords] = useState<Testimonial[]>([]);
  const [selected, setSelected] = useState<Testimonial | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [language, setLanguage] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TestimonialEditorValues>({
    resolver: zodResolver(testimonialEditorSchema),
    defaultValues: emptyTestimonial,
  });
  const queryClient = useQueryClient();
  const { notify } = useAdminFeedback();
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError('');
      try {
        const result = await listAdminTestimonials({
          page,
          languageCode: language,
          status,
          signal,
        });
        setRecords(result.data);
        setPages(Math.max(1, result.meta.totalPages));
      } catch (cause) {
        if (!signal?.aborted) setError(getApiErrorMessageWithDetails(cause));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, language, status],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  function select(record: Testimonial | null) {
    setSelected(record);
    reset(
      record
        ? {
            name: record.name,
            text: record.text,
            languageCode: record.languageCode,
            status: record.status,
          }
        : { ...emptyTestimonial, languageCode: language === 'am' ? 'am' : 'en' },
    );
    setError('');
  }
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.engagement.adminTestimonials() });
    await queryClient.invalidateQueries({ queryKey: queryKeys.engagement.testimonials() });
    await load();
  }
  async function onSubmit(values: TestimonialEditorValues) {
    setError('');
    try {
      const saved = selected
        ? await updateTestimonial(selected.id, values)
        : await createTestimonial(values);
      setSelected(saved);
      reset({
        name: saved.name,
        text: saved.text,
        languageCode: saved.languageCode,
        status: saved.status,
      });
      await refresh();
      notify({
        title: selected ? 'Testimonial updated' : 'Testimonial created',
        message:
          saved.status === 'PUBLISHED'
            ? 'Visible on the public website.'
            : 'Saved as a private draft.',
      });
    } catch (cause) {
      setError(
        `${getApiErrorMessageWithDetails(cause)} Your unsaved testimonial remains in the editor.`,
      );
    }
  }
  async function remove(record: Testimonial) {
    try {
      await deleteTestimonial(record.id);
      if (selected?.id === record.id) select(null);
      await refresh();
      notify({
        title: 'Testimonial deleted',
        message: 'The public and administrative caches were refreshed.',
      });
    } catch (cause) {
      setError(getApiErrorMessageWithDetails(cause));
      throw cause;
    }
  }
  return (
    <section aria-labelledby="testimonial-heading">
      <div>
        <EngagementHeading
          id="testimonial-heading"
          eyebrow="Content moderation"
          title="Testimonials"
          description="Create, review and publish localized testimonials. Draft records are never returned by the public API."
        />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" onClick={() => select(null)}>
          <FilePlus2 aria-hidden="true" /> New testimonial
        </Button>
        <LanguageFilter
          value={language}
          onChange={(value) => {
            setLanguage(value);
            setPage(1);
          }}
        />
        <select
          aria-label="Testimonial status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="min-h-11 rounded-lg border bg-white px-3"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
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
      <div className="mt-6 grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="bg-card h-fit rounded-xl border p-4 shadow-sm">
          <h2 className="text-heading font-semibold">Moderation queue</h2>
          <LoadState loading={loading} error="" empty={records.length === 0}>
            <ul className="mt-4 space-y-2">
              {records.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => select(record)}
                    aria-current={selected?.id === record.id ? 'true' : undefined}
                    className={`w-full rounded-lg border p-3 text-left ${selected?.id === record.id ? 'border-primary bg-green-50' : ''}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{record.name}</span>
                      <AdminStatusBadge status={record.status} />
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm">{record.text}</span>
                  </button>
                </li>
              ))}
            </ul>
            <ListPager page={page} pages={pages} onPage={setPage} />
          </LoadState>
        </aside>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="bg-card rounded-xl border p-5 shadow-sm"
        >
          <h2 className="text-heading text-xl font-semibold">
            {selected ? 'Edit testimonial' : 'New testimonial'}
          </h2>
          <div className="mt-5 grid gap-4">
            <AdminFormField
              label="Name"
              maxLength={100}
              error={errors.name?.message}
              {...register('name')}
            />
            <AdminFormTextarea
              label="Testimonial"
              maxLength={2000}
              rows={8}
              error={errors.text?.message}
              {...register('text')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminFormSelect
                label="Language"
                disabled={Boolean(selected)}
                error={errors.languageCode?.message}
                {...register('languageCode')}
              >
                <option value="en">English</option>
                <option value="am">Amharic</option>
              </AdminFormSelect>
              <AdminFormSelect
                label="Visibility"
                error={errors.status?.message}
                {...register('status')}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </AdminFormSelect>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting}>
              <Save aria-hidden="true" /> {isSubmitting ? 'Saving…' : 'Save testimonial'}
            </Button>
            {selected && (
              <ConfirmedActionButton
                title="Delete testimonial?"
                description="This removes the testimonial from both the moderation queue and the public website."
                confirmLabel="Delete testimonial"
                onConfirm={() => remove(selected)}
              >
                <Trash2 aria-hidden="true" /> Delete
              </ConfirmedActionButton>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
