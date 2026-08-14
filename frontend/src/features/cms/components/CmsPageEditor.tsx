'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Eye, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { getApiErrorMessage } from '@/lib/api/errors';
import {
  checkCmsSlug,
  createCmsPage,
  deleteCmsPage,
  editorValuesFromPage,
  getAdminCmsPage,
  publishCmsPage,
  scheduleCmsPage,
  updateCmsPage,
} from '../admin-cms.client';
import { cmsEditorSchema, type AdminCmsPage, type CmsEditorValues } from '../admin-cms.schemas';
import { CmsContentPreview } from './CmsContentPreview';
import { CmsStatusBadge } from './CmsStatusBadge';
import {
  AboutEditor,
  FaqEditor,
  HomepageEditor,
  TeamMembersEditor,
  VolunteerRolesEditor,
} from './StructuredContentEditors';

export function CmsPageEditor({ pageId }: { pageId?: string }) {
  const router = useRouter();
  const { notify } = useAdminFeedback();
  const [page, setPage] = useState<AdminCmsPage | null>(null);
  const [values, setValues] = useState<CmsEditorValues>(() => editorValuesFromPage());
  const [loading, setLoading] = useState(Boolean(pageId));
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [slugState, setSlugState] = useState<string>('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledLocal, setScheduledLocal] = useState('');

  useEffect(() => {
    if (!pageId) return;
    const controller = new AbortController();
    void getAdminCmsPage(pageId, controller.signal)
      .then((loaded) => {
        setPage(loaded);
        setValues(editorValuesFromPage(loaded));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setErrors([getApiErrorMessage(error)]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [pageId]);

  const publishedEditWarning = page?.status === 'PUBLISHED';
  const heading = page ? `Edit ${page.title}` : 'Create CMS page';
  const minimumSchedule = useMemo(() => localDateTimeValue(new Date(Date.now() + 60_000)), []);

  async function save() {
    const parsed = cmsEditorSchema.safeParse(values);
    if (!parsed.success) {
      setErrors([...new Set(parsed.error.issues.map((issue) => issue.message))]);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      const saved = page
        ? await updateCmsPage(page.id, parsed.data)
        : await createCmsPage(parsed.data);
      setPage(saved);
      setValues(editorValuesFromPage(saved));
      notify({
        title: page ? 'Page changes saved' : 'Draft page created',
        message:
          page?.status === 'PUBLISHED' && saved.status === 'DRAFT'
            ? 'The published page returned to draft so the new changes are not public yet.'
            : `Current status: ${saved.status}.`,
      });
      if (!page) router.replace(`/admin/content/${saved.id}`);
    } catch (error) {
      setErrors([getApiErrorMessage(error)]);
    } finally {
      setBusy(false);
    }
  }

  async function checkSlug() {
    if (page && values.slug === page.slug && values.languageCode === page.languageCode) {
      setSlugState('This is the current page slug.');
      return;
    }
    const basic = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug);
    if (!basic) {
      setSlugState('Use lowercase kebab-case before checking availability.');
      return;
    }
    try {
      const result = await checkCmsSlug(values.slug, values.languageCode);
      setSlugState(result.available ? 'Slug is available.' : 'Slug is already in use.');
    } catch (error) {
      setSlugState(getApiErrorMessage(error));
    }
  }

  async function publish() {
    if (!page || busy) return;
    setBusy(true);
    setErrors([]);
    try {
      const published = await publishCmsPage(page.id);
      setPage(published);
      notify({ title: 'Page published', message: 'The page is now publicly available.' });
    } catch (error) {
      setErrors([getApiErrorMessage(error)]);
    } finally {
      setBusy(false);
    }
  }

  async function schedule() {
    if (!page || busy) return;
    if (!scheduledLocal || new Date(scheduledLocal) <= new Date()) {
      setErrors(['Choose a future local date and time.']);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      const scheduled = await scheduleCmsPage(page.id, scheduledLocal);
      setPage(scheduled);
      setScheduleOpen(false);
      notify({
        title: 'Publication scheduled',
        message: `Scheduled for ${new Date(scheduled.scheduledAt!).toLocaleString()}.`,
      });
    } catch (error) {
      setErrors([getApiErrorMessage(error)]);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!page) return;
    await deleteCmsPage(page.id);
    notify({ title: 'CMS page deleted' });
    router.replace('/admin/content');
  }

  if (loading)
    return (
      <div
        role="status"
        aria-label="Loading CMS editor"
        className="bg-card h-96 animate-pulse rounded-xl border motion-reduce:animate-none"
      />
    );
  return (
    <section aria-labelledby="editor-heading">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">CMS editor</p>
          <h1
            id="editor-heading"
            className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
          >
            {heading}
          </h1>
          {page && (
            <div className="mt-3 flex items-center gap-3">
              <CmsStatusBadge status={page.status} />
              {page.scheduledAt && (
                <span className="text-sm">{new Date(page.scheduledAt).toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
        <Button type="button" variant="outline" onClick={() => setPreview((current) => !current)}>
          <Eye aria-hidden="true" /> {preview ? 'Edit content' : 'Preview'}
        </Button>
      </div>

      {publishedEditWarning && (
        <p className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 font-medium text-amber-950">
          <strong>Published-content rule:</strong> saving any edit returns this page to DRAFT.
          Publish again only after reviewing the changes.
        </p>
      )}
      {errors.length > 0 && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900"
        >
          <p className="font-semibold">
            The page was not saved. Your unsaved content remains in the editor.
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {preview ? (
        <div className="mt-8">
          <CmsContentPreview values={values} />
        </div>
      ) : (
        <form
          className="bg-card mt-8 space-y-6 rounded-xl border p-5 shadow-sm sm:p-7"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          noValidate
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <EditorField
              label="Title"
              value={values.title}
              maxLength={255}
              onChange={(title) => setValues({ ...values, title })}
            />
            <label className="block">
              <span className="text-heading mb-2 block text-sm font-semibold">Language</span>
              <select
                value={values.languageCode}
                disabled={Boolean(page)}
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
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <EditorField
              label="Slug"
              value={values.slug}
              maxLength={180}
              onChange={(slug) => {
                setValues({ ...values, slug });
                setSlugState('');
              }}
            />
            <Button type="button" variant="outline" onClick={() => void checkSlug()}>
              Check availability
            </Button>
          </div>
          {slugState && (
            <p role="status" className="text-sm font-medium">
              {slugState}
            </p>
          )}
          {!page && (
            <EditorField
              label="Translation key (optional UUID)"
              value={values.translationKey}
              onChange={(translationKey) => setValues({ ...values, translationKey })}
            />
          )}
          <label className="block">
            <span className="text-heading mb-2 block text-sm font-semibold">Content structure</span>
            <select
              value={values.contentType}
              onChange={(event) =>
                setValues({
                  ...values,
                  contentType: event.target.value as CmsEditorValues['contentType'],
                })
              }
              className="min-h-11 w-full rounded-lg border bg-white px-3"
            >
              <option value="generic">Generic page</option>
              <option value="homepage">Homepage composition</option>
              <option value="faq">FAQ collection</option>
              <option value="about">About: mission, history and services</option>
              <option value="volunteer">Volunteer role listings</option>
              <option value="team">Approved team biographies</option>
            </select>
          </label>
          <label className="block">
            <span className="text-heading mb-2 block text-sm font-semibold">Page content</span>
            <textarea
              value={values.content}
              maxLength={200_000}
              rows={12}
              onChange={(event) => setValues({ ...values, content: event.target.value })}
              className="w-full rounded-lg border p-3"
            />
            <span className="text-foreground mt-1 block text-right text-xs">
              {values.content.length.toLocaleString()} / 200,000
            </span>
          </label>
          {values.contentType === 'homepage' && (
            <HomepageEditor
              value={values.homepage}
              onChange={(homepage) => setValues({ ...values, homepage })}
            />
          )}
          {values.contentType === 'faq' && (
            <FaqEditor value={values.faqs} onChange={(faqs) => setValues({ ...values, faqs })} />
          )}
          {values.contentType === 'about' && (
            <AboutEditor
              value={values.about}
              onChange={(about) => setValues({ ...values, about })}
            />
          )}
          {values.contentType === 'volunteer' && (
            <VolunteerRolesEditor
              value={values.volunteerRoles}
              onChange={(volunteerRoles) => setValues({ ...values, volunteerRoles })}
            />
          )}
          {values.contentType === 'team' && (
            <TeamMembersEditor
              value={values.teamMembers}
              onChange={(teamMembers) => setValues({ ...values, teamMembers })}
              approved={values.teamContentApproved}
              onApprovalChange={(teamContentApproved) =>
                setValues({ ...values, teamContentApproved })
              }
            />
          )}
          <Button type="submit" disabled={busy} className="min-h-11">
            <Save aria-hidden="true" /> {busy ? 'Saving…' : page ? 'Save changes' : 'Create draft'}
          </Button>
        </form>
      )}

      {page && (
        <section
          aria-labelledby="workflow-heading"
          className="bg-card mt-8 rounded-xl border p-5 shadow-sm"
        >
          <h2 id="workflow-heading" className="text-heading text-xl font-semibold">
            Publishing workflow
          </h2>
          <p className="text-foreground mt-2 text-sm">
            Status changes are explicit and never occur from previewing content.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={busy || page.status === 'PUBLISHED'}
              onClick={() => void publish()}
            >
              <Send aria-hidden="true" /> Publish now
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setScheduleOpen((current) => !current)}
            >
              <CalendarClock aria-hidden="true" /> Schedule
            </Button>
            <ConfirmedActionButton
              title="Delete this CMS page?"
              description="The page and its localized SEO metadata will be permanently removed. This action is audited."
              confirmLabel="Delete page"
              onConfirm={remove}
            >
              Delete page
            </ConfirmedActionButton>
          </div>
          {scheduleOpen && (
            <div className="mt-5 flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-end">
              <label className="flex-1">
                <span className="text-heading mb-2 block text-sm font-semibold">
                  Local publication date and time
                </span>
                <input
                  type="datetime-local"
                  min={minimumSchedule}
                  value={scheduledLocal}
                  onChange={(event) => setScheduledLocal(event.target.value)}
                  className="min-h-11 w-full rounded-lg border bg-white px-3"
                />
              </label>
              <Button type="button" disabled={busy} onClick={() => void schedule()}>
                Confirm schedule
              </Button>
              <p className="text-foreground text-xs sm:max-w-48">
                Your local selection is converted to an ISO timestamp before transmission.
              </p>
            </div>
          )}
        </section>
      )}
    </section>
  );
}

function EditorField({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="block">
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

function localDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
