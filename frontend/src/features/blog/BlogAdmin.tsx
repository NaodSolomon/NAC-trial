'use client';

import { useCallback, useEffect, useState } from 'react';
import { FilePlus2, RotateCcw, Save, Send, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuthStore } from '@/store/auth.store';
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
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [selected, setSelected] = useState<AdminBlogPost | null>(null);
  const [values, setValues] = useState<BlogEditorValues>(emptyBlogEditor);
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
        const result = await listAdminBlog({ page, languageCode: language, signal });
        setPosts(result.data);
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
    await queryClient.invalidateQueries({ queryKey: queryKeys.blog.all });
    await load();
  }
  function choose(post: AdminBlogPost | null) {
    setSelected(post);
    setValues(
      post
        ? blogEditorFromPost(post)
        : { ...emptyBlogEditor, languageCode: language === 'am' ? 'am' : 'en' },
    );
    setError('');
  }
  async function save() {
    const parsed = blogEditorSchema.safeParse(values);
    if (!parsed.success)
      return setError([...new Set(parsed.error.issues.map((issue) => issue.message))].join(' '));
    setSaving(true);
    setError('');
    try {
      const saved = selected
        ? await updateBlog(selected.id, parsed.data)
        : await createBlog(parsed.data);
      setSelected(saved);
      setValues(blogEditorFromPost(saved));
      await refresh();
      notify({
        title: selected ? 'Blog post saved as draft' : 'Blog draft created',
        message: saved.title,
      });
    } catch (saveError) {
      setError(
        `${getApiErrorMessageWithDetails(saveError)} Your unsaved article remains in the editor.`,
      );
    } finally {
      setSaving(false);
    }
  }
  async function publish(post: AdminBlogPost) {
    const published = await publishBlog(post.id);
    setSelected(published);
    setValues(blogEditorFromPost(published));
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
          ) : posts.length === 0 ? (
            <p className="mt-4 text-sm">No articles match this language.</p>
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
          className="bg-card space-y-5 rounded-xl border p-6 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
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
            <Field
              label="Slug"
              value={values.slug}
              maxLength={180}
              onChange={(slug) => setValues({ ...values, slug })}
            />
            <label>
              <span className="text-heading mb-2 block text-sm font-semibold">Language</span>
              <select
                value={values.languageCode}
                disabled={Boolean(selected)}
                onChange={(event) =>
                  setValues({ ...values, languageCode: event.target.value as 'en' | 'am' })
                }
                className="min-h-11 w-full rounded-lg border bg-white px-3"
              >
                <option value="en">English</option>
                <option value="am">Amharic</option>
              </select>
            </label>
          </div>
          <Field
            label="Title"
            value={values.title}
            maxLength={255}
            onChange={(title) => setValues({ ...values, title })}
          />
          <Textarea
            label="Excerpt"
            value={values.excerpt}
            maxLength={500}
            rows={3}
            onChange={(excerpt) => setValues({ ...values, excerpt })}
          />
          <Textarea
            label="Article content"
            value={values.content}
            maxLength={200000}
            rows={12}
            onChange={(content) => setValues({ ...values, content })}
          />
          <fieldset className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
            <legend className="px-2 font-semibold">SEO</legend>
            <Field
              label="SEO title"
              value={values.seoTitle}
              maxLength={70}
              onChange={(seoTitle) => setValues({ ...values, seoTitle })}
            />
            <Field
              label="SEO image URL"
              value={values.seoImageUrl}
              maxLength={2048}
              onChange={(seoImageUrl) => setValues({ ...values, seoImageUrl })}
            />
            <div className="md:col-span-2">
              <Textarea
                label="SEO description"
                value={values.seoDescription}
                maxLength={160}
                rows={3}
                onChange={(seoDescription) => setValues({ ...values, seoDescription })}
              />
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              <Save aria-hidden="true" />
              {saving ? 'Saving…' : selected ? 'Save changes' : 'Create draft'}
            </Button>
            {selected && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setValues(blogEditorFromPost(selected));
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
      <span className="text-heading mb-2 flex justify-between text-sm font-semibold">
        <span>{label}</span>
        <span className="font-normal">
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
function Textarea({
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
    <label>
      <span className="text-heading mb-2 flex justify-between text-sm font-semibold">
        <span>{label}</span>
        <span className="font-normal">
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
