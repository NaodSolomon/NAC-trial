'use client';

import { useCallback, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FilePlus2, RotateCcw, Save, Send, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import {
  AdminFormField,
  AdminFormSelect,
  AdminFormTextarea,
} from '@/components/admin/AdminFormField';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuthStore } from '@/store/auth.store';
import { useAdminList } from '@/hooks/use-admin-list';
import {
  createBlog,
  deleteBlog,
  listAdminBlog,
  publishBlog,
  updateBlog,
} from './blog-admin.client';
import {
  blogEditorFromPost,
  blogEditorSchema,
  emptyBlogEditor,
  type AdminBlogPost,
  type BlogEditorValues,
} from './blog-admin.schemas';

export function BlogAdmin() {
  const [selected, setSelected] = useState<AdminBlogPost | null>(null);
  const [language, setLanguage] = useState('');
  const role = useAuthStore((state) => state.user?.role);
  const queryClient = useQueryClient();
  const { notify } = useAdminFeedback();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BlogEditorValues>({
    resolver: zodResolver(blogEditorSchema),
    defaultValues: emptyBlogEditor,
  });
  const watched = useWatch({ control });
  const {
    records: posts,
    page,
    setPage,
    pages,
    loading,
    error,
    setError,
    reload: load,
  } = useAdminList<AdminBlogPost>(
    useCallback(
      ({ page, signal }) => listAdminBlog({ page, languageCode: language, signal }),
      [language],
    ),
  );
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.blog.all });
    await load();
  }
  function choose(post: AdminBlogPost | null) {
    setSelected(post);
    reset(
      post
        ? blogEditorFromPost(post)
        : { ...emptyBlogEditor, languageCode: language === 'am' ? 'am' : 'en' },
    );
    setError('');
  }
  async function onSubmit(values: BlogEditorValues) {
    setError('');
    try {
      const saved = selected ? await updateBlog(selected.id, values) : await createBlog(values);
      setSelected(saved);
      reset(blogEditorFromPost(saved));
      await refresh();
      notify({
        title: selected ? 'Blog post saved as draft' : 'Blog draft created',
        message: saved.title,
      });
    } catch (saveError) {
      setError(
        `${getApiErrorMessageWithDetails(saveError)} Your unsaved article remains in the editor.`,
      );
    }
  }
  async function publish(post: AdminBlogPost) {
    const published = await publishBlog(post.id);
    setSelected(published);
    reset(blogEditorFromPost(published));
    await refresh();
    notify({ title: 'Blog post published', message: post.title });
  }
  async function remove(post: AdminBlogPost) {
    await deleteBlog(post.id);
    if (selected?.id === post.id) choose(null);
    await refresh();
    notify({ title: 'Blog post deleted', message: post.title });
  }
  return (
    <section aria-labelledby="blog-admin-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">
        Content publishing
      </p>
      <h1
        id="blog-admin-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        Blog administration
      </h1>
      <p className="text-foreground mt-2">
        Drafts and published articles remain visibly distinct. Editing a published article returns
        it to draft.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" onClick={() => choose(null)}>
          <FilePlus2 aria-hidden="true" /> New article
        </Button>
        <select
          aria-label="Blog language"
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
      <div className="mt-6 grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="bg-card h-fit rounded-xl border p-4 shadow-sm">
          <h2 className="text-heading font-semibold">Articles</h2>
          {loading ? (
            <p role="status" className="mt-4">
              Loading articles…
            </p>
          ) : error ? null : posts.length === 0 ? (
            <AdminEmptyState
              entity="articles"
              filtered={Boolean(language)}
              onClearFilters={() => setLanguage('')}
            />
          ) : (
            <ul className="mt-4 space-y-2">
              {posts.map((post) => (
                <li key={post.id}>
                  <button
                    type="button"
                    onClick={() => choose(post)}
                    className={`w-full rounded-lg border p-3 text-left ${selected?.id === post.id ? 'border-primary bg-green-50' : ''}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{post.title}</span>
                      <AdminStatusBadge status={post.status} />
                    </span>
                    <span className="text-foreground mt-1 block text-xs">
                      {post.languageCode.toUpperCase()} · /{post.slug}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex justify-between">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= pages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </aside>
        <form
          noValidate
          className="bg-card space-y-5 rounded-xl border p-6 shadow-sm"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-heading font-serif text-2xl font-semibold">
                {selected ? `Edit ${selected.title}` : 'Create blog draft'}
              </h2>
              {selected && (
                <div className="mt-2">
                  <AdminStatusBadge status={selected.status} />
                </div>
              )}
            </div>
            {selected?.status === 'PUBLISHED' && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                Saving changes returns this article to DRAFT.
              </p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField
              label="Slug"
              maxLength={180}
              counted={watched.slug ?? ''}
              error={errors.slug?.message}
              {...register('slug')}
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
          </div>
          <AdminFormField
            label="Title"
            maxLength={255}
            counted={watched.title ?? ''}
            error={errors.title?.message}
            {...register('title')}
          />
          <AdminFormTextarea
            label="Excerpt"
            maxLength={500}
            rows={3}
            counted={watched.excerpt ?? ''}
            error={errors.excerpt?.message}
            {...register('excerpt')}
          />
          <AdminFormTextarea
            label="Article content"
            maxLength={200000}
            rows={12}
            counted={watched.content ?? ''}
            error={errors.content?.message}
            {...register('content')}
          />
          <fieldset className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
            <legend className="px-2 font-semibold">SEO</legend>
            <AdminFormField
              label="SEO title"
              maxLength={70}
              counted={watched.seoTitle ?? ''}
              error={errors.seoTitle?.message}
              {...register('seoTitle')}
            />
            <AdminFormField
              label="SEO image URL"
              maxLength={2048}
              counted={watched.seoImageUrl ?? ''}
              error={errors.seoImageUrl?.message}
              {...register('seoImageUrl')}
            />
            <div className="md:col-span-2">
              <AdminFormTextarea
                label="SEO description"
                maxLength={160}
                rows={3}
                counted={watched.seoDescription ?? ''}
                error={errors.seoDescription?.message}
                {...register('seoDescription')}
              />
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSubmitting}>
              <Save aria-hidden="true" />
              {isSubmitting ? 'Saving…' : selected ? 'Save changes' : 'Create draft'}
            </Button>
            {selected && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset(blogEditorFromPost(selected));
                  setError('');
                }}
              >
                <RotateCcw aria-hidden="true" /> Reset
              </Button>
            )}
            {selected?.status === 'DRAFT' && (
              <Button type="button" onClick={() => void publish(selected)}>
                <Send aria-hidden="true" /> Publish
              </Button>
            )}
            {selected && role === 'SUPER_ADMIN' && (
              <ConfirmedActionButton
                title="Delete blog post?"
                description="This article will be permanently removed."
                confirmLabel="Delete article"
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
