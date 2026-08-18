'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, FilePlus2, Save, Send, Trash2, Undo2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import {
  AdminFormField,
  AdminFormSelect,
  AdminFormTextarea,
} from '@/components/admin/AdminFormField';
import { Button } from '@/components/ui/button';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuthStore } from '@/store/auth.store';
import {
  createFaq,
  deleteFaq,
  listAdminFaqs,
  publishFaq,
  reorderFaqs,
  unpublishFaq,
  updateFaq,
} from './faq-admin.client';
import {
  emptyFaqEditor,
  faqEditorFromEntry,
  faqEditorSchema,
  type AdminFaq,
  type FaqEditorValues,
} from './faq-admin.schemas';

export function FaqAdmin() {
  const [entries, setEntries] = useState<AdminFaq[]>([]);
  const [selected, setSelected] = useState<AdminFaq | null>(null);
  const [language, setLanguage] = useState('en');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const role = useAuthStore((state) => state.user?.role);
  const queryClient = useQueryClient();
  const { notify } = useAdminFeedback();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FaqEditorValues>({
    resolver: zodResolver(faqEditorSchema),
    defaultValues: emptyFaqEditor,
  });

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError('');
      try {
        const result = await listAdminFaqs({ page: 1, languageCode: language, status, signal });
        if (signal?.aborted) return;
        setEntries(result.data);
      } catch (loadError) {
        if (!signal?.aborted) setError(getApiErrorMessageWithDetails(loadError));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [language, status],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.faq.all });
    await load();
  }

  function choose(entry: AdminFaq | null) {
    setSelected(entry);
    reset(
      entry
        ? faqEditorFromEntry(entry)
        : { ...emptyFaqEditor, languageCode: language === 'am' ? 'am' : 'en' },
    );
    setError('');
  }

  async function onSubmit(values: FaqEditorValues) {
    setError('');
    try {
      const saved = selected ? await updateFaq(selected.id, values) : await createFaq(values);
      setSelected(saved);
      reset(faqEditorFromEntry(saved));
      await refresh();
      notify({
        title: selected ? 'FAQ entry saved' : 'FAQ draft created',
        message: saved.question,
      });
    } catch (saveError) {
      setError(
        `${getApiErrorMessageWithDetails(saveError)} Your unsaved answer remains in the editor.`,
      );
    }
  }

  async function togglePublication(entry: AdminFaq) {
    try {
      const next =
        entry.status === 'PUBLISHED' ? await unpublishFaq(entry.id) : await publishFaq(entry.id);
      if (selected?.id === entry.id) {
        setSelected(next);
        reset(faqEditorFromEntry(next));
      }
      await refresh();
      notify({
        title: next.status === 'PUBLISHED' ? 'FAQ entry published' : 'FAQ entry returned to draft',
        message: next.question,
      });
    } catch (toggleError) {
      setError(getApiErrorMessageWithDetails(toggleError));
    }
  }

  async function remove(entry: AdminFaq) {
    try {
      await deleteFaq(entry.id);
      if (selected?.id === entry.id) choose(null);
      await refresh();
      notify({ title: 'FAQ entry deleted', message: entry.question });
    } catch (deleteError) {
      setError(getApiErrorMessageWithDetails(deleteError));
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= entries.length) return;

    const reordered = [...entries];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setEntries(reordered);

    try {
      await reorderFaqs(
        reordered.map((entry, position) => ({ id: entry.id, sortOrder: position })),
      );
      await refresh();
      notify({ title: 'FAQ order updated', message: reordered[target].question });
    } catch (moveError) {
      setError(getApiErrorMessageWithDetails(moveError));
      await load();
    }
  }

  return (
    <section aria-labelledby="faq-admin-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">
        Content publishing
      </p>
      <h1
        id="faq-admin-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        FAQ administration
      </h1>
      <p className="text-foreground mt-2">
        Each question is published independently and shown to visitors in the order listed here.
        Drafts stay off the public page until you publish them.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" onClick={() => choose(null)}>
          <FilePlus2 aria-hidden="true" /> New question
        </Button>
        <select
          aria-label="FAQ language"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="min-h-11 rounded-lg border bg-white px-3"
        >
          <option value="en">English</option>
          <option value="am">Amharic</option>
        </select>
        <select
          aria-label="FAQ status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
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

      <div className="mt-6 grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <aside className="bg-card h-fit rounded-xl border p-4 shadow-sm">
          <h2 className="text-heading font-semibold">Questions</h2>
          {loading ? (
            <p role="status" className="mt-4">
              Loading questions…
            </p>
          ) : error ? null : entries.length === 0 ? (
            <AdminEmptyState
              entity="questions"
              filtered={Boolean(status)}
              onClearFilters={() => setStatus('')}
            />
          ) : (
            <ol className="mt-4 space-y-2">
              {entries.map((entry, index) => (
                <li key={entry.id} className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => choose(entry)}
                    aria-current={selected?.id === entry.id ? 'true' : undefined}
                    className={`flex-1 rounded-lg border p-3 text-left ${
                      selected?.id === entry.id ? 'border-primary bg-green-50' : ''
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{entry.question}</span>
                      <AdminStatusBadge status={entry.status} />
                    </span>
                    <span className="text-foreground mt-1 block text-xs">
                      {entry.category ?? 'General'} · position {index + 1}
                    </span>
                  </button>
                  <span className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Move "${entry.question}" up`}
                      disabled={index === 0}
                      onClick={() => void move(index, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Move "${entry.question}" down`}
                      disabled={index === entries.length - 1}
                      onClick={() => void move(index, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </aside>

        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="bg-card rounded-xl border p-5 shadow-sm"
        >
          <h2 className="text-heading font-semibold">
            {selected ? 'Edit question' : 'New question'}
          </h2>

          <div className="mt-4 grid gap-4">
            <AdminFormField
              label="Translation key"
              placeholder="what-does-the-center-do"
              disabled={Boolean(selected)}
              error={errors.translationKey?.message}
              hint="Shared across languages so English and Amharic answers stay paired. It cannot change after creation."
              {...register('translationKey')}
            />

            <AdminFormSelect
              label="Language"
              disabled={Boolean(selected)}
              error={errors.languageCode?.message}
              {...register('languageCode')}
            >
              <option value="en">English</option>
              <option value="am">Amharic</option>
            </AdminFormSelect>

            <AdminFormField
              label="Category"
              placeholder="Services"
              error={errors.category?.message}
              hint="Optional. Questions sharing a category are grouped on the public page."
              {...register('category')}
            />

            <AdminFormField
              label="Question"
              error={errors.question?.message}
              {...register('question')}
            />

            <AdminFormTextarea
              label="Answer"
              rows={8}
              error={errors.answer?.message}
              {...register('answer')}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting}>
              <Save aria-hidden="true" /> {isSubmitting ? 'Saving…' : 'Save'}
            </Button>

            {selected && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void togglePublication(selected)}
              >
                {selected.status === 'PUBLISHED' ? (
                  <>
                    <Undo2 aria-hidden="true" /> Return to draft
                  </>
                ) : (
                  <>
                    <Send aria-hidden="true" /> Publish
                  </>
                )}
              </Button>
            )}

            {selected && role === 'SUPER_ADMIN' && (
              <ConfirmedActionButton
                title="Delete this FAQ entry?"
                description={`"${selected.question}" will be removed from the public page immediately.`}
                confirmLabel="Delete FAQ entry"
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
