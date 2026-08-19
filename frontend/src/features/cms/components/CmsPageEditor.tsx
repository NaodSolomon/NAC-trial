'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { CalendarClock, Eye, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AdminFormField,
  AdminFormSelect,
  AdminFormTextarea,
} from '@/components/admin/AdminFormField';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
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
  HomepageEditor,
  TeamMembersEditor,
  VolunteerRolesEditor,
} from './StructuredContentEditors';

export function CmsPageEditor({ pageId }: { pageId?: string }) {
  const router = useRouter();
  const { notify } = useAdminFeedback();
  const [page, setPage] = useState<AdminCmsPage | null>(null);
  const [loading, setLoading] = useState(Boolean(pageId));
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [slugState, setSlugState] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CmsEditorValues>({
    resolver: zodResolver(cmsEditorSchema),
    defaultValues: editorValuesFromPage(),
  });

  const contentType = useWatch({ control, name: 'contentType' });
  const content = useWatch({ control, name: 'content' });
  const slug = useWatch({ control, name: 'slug' });
  const languageCode = useWatch({ control, name: 'languageCode' });
  const homepage = useWatch({ control, name: 'homepage' });
  const about = useWatch({ control, name: 'about' });
  const volunteerRoles = useWatch({ control, name: 'volunteerRoles' });
  const teamMembers = useWatch({ control, name: 'teamMembers' });
  const teamContentApproved = useWatch({ control, name: 'teamContentApproved' });

  useEffect(() => {
    if (!pageId) return;
    const controller = new AbortController();
    void getAdminCmsPage(pageId, controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) return;
        setPage(loaded);
        reset(editorValuesFromPage(loaded));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setRequestError(getApiErrorMessageWithDetails(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [pageId, reset]);

  // Availability is answered for one slug in one language, so it must not survive
  // a change to either.
  useEffect(() => {
    setSlugState('');
  }, [slug, languageCode]);

  const publishedEditWarning = page?.status === 'PUBLISHED';
  const heading = page ? `Edit ${page.title}` : 'Create CMS page';

  async function save(values: CmsEditorValues) {
    setRequestError('');
    try {
      const saved = page ? await updateCmsPage(page.id, values) : await createCmsPage(values);
      setPage(saved);
      reset(editorValuesFromPage(saved));
      notify({
        title: page ? 'Page changes saved' : 'Draft page created',
        message:
          page?.status === 'PUBLISHED' && saved.status === 'DRAFT'
            ? 'The published page returned to draft so the new changes are not public yet.'
            : `Current status: ${saved.status}.`,
      });
      if (!page) router.replace(`/admin/content/${saved.id}`);
    } catch (error) {
      setRequestError(getApiErrorMessageWithDetails(error));
    }
  }

  const checkSlug = useCallback(async () => {
    const current = getValues();
    if (page && current.slug === page.slug && current.languageCode === page.languageCode) {
      setSlugState('This is the current page slug.');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(current.slug)) {
      setSlugState('Use lowercase kebab-case before checking availability.');
      return;
    }
    try {
      const result = await checkCmsSlug(current.slug, current.languageCode);
      setSlugState(result.available ? 'Slug is available.' : 'Slug is already in use.');
    } catch (error) {
      setSlugState(getApiErrorMessageWithDetails(error));
    }
  }, [getValues, page]);

  async function publish() {
    if (!page || busy) return;
    setBusy(true);
    setRequestError('');
    try {
      const published = await publishCmsPage(page.id);
      setPage(published);
      notify({ title: 'Page published', message: 'The page is now publicly available.' });
    } catch (error) {
      setRequestError(getApiErrorMessageWithDetails(error));
    } finally {
      setBusy(false);
    }
  }

  async function schedule() {
    if (!page || busy) return;
    if (!scheduledLocal || new Date(scheduledLocal) <= new Date()) {
      setScheduleError('Choose a future local date and time.');
      return;
    }
    setBusy(true);
    setScheduleError('');
    setRequestError('');
    try {
      const scheduled = await scheduleCmsPage(page.id, scheduledLocal);
      setPage(scheduled);
      setScheduleOpen(false);
      notify({
        title: 'Publication scheduled',
        message: `Scheduled for ${new Date(scheduled.scheduledAt!).toLocaleString()}.`,
      });
    } catch (error) {
      setScheduleError(getApiErrorMessageWithDetails(error));
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
      {requestError && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900"
        >
          <p className="font-semibold">
            The page was not saved. Your unsaved content remains in the editor.
          </p>
          <p className="mt-2 text-sm">{requestError}</p>
        </div>
      )}

      {preview ? (
        <div className="mt-8">
          <CmsContentPreview values={getValues()} />
        </div>
      ) : (
        <form
          aria-label="CMS page details"
          className="bg-card mt-8 space-y-6 rounded-xl border p-5 shadow-sm sm:p-7"
          onSubmit={handleSubmit(save)}
          noValidate
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <AdminFormField
              label="Title"
              id="cms-title"
              maxLength={255}
              error={errors.title?.message}
              {...register('title')}
            />
            <AdminFormSelect
              label="Language"
              id="cms-language"
              disabled={Boolean(page)}
              hint={page ? 'The language is fixed once a page exists.' : undefined}
              error={errors.languageCode?.message}
              {...register('languageCode')}
            >
              <option value="en">English</option>
              <option value="am">Amharic</option>
            </AdminFormSelect>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
            <AdminFormField
              label="Slug"
              id="cms-slug"
              maxLength={180}
              hint={slugState || undefined}
              error={errors.slug?.message}
              {...register('slug')}
            />
            <Button
              type="button"
              variant="outline"
              className="mt-9"
              onClick={() => void checkSlug()}
            >
              Check availability
            </Button>
          </div>
          {!page && (
            <AdminFormField
              label="Translation key (optional UUID)"
              id="cms-translation-key"
              hint="Leave blank unless this page pairs with an existing translation."
              error={errors.translationKey?.message}
              {...register('translationKey')}
            />
          )}
          <AdminFormSelect
            label="Content structure"
            id="cms-content-type"
            error={errors.contentType?.message}
            {...register('contentType')}
          >
            <option value="generic">Generic page</option>
            <option value="homepage">Homepage composition</option>
            <option value="about">About: mission, history and services</option>
            <option value="volunteer">Volunteer role listings</option>
            <option value="team">Approved team biographies</option>
            <option value="contact">Contact page with map</option>
          </AdminFormSelect>
          <AdminFormTextarea
            label="Page content"
            id="cms-content"
            rows={12}
            maxLength={200_000}
            counted={content ?? ''}
            error={errors.content?.message}
            {...register('content')}
          />
          {contentType === 'homepage' && (
            <HomepageEditor
              value={homepage}
              errors={{
                heroHeading: errors.homepage?.heroHeading?.message,
                servicesHeading: errors.homepage?.servicesHeading?.message,
                services: errors.homepage?.services?.message,
                locationHeading: errors.homepage?.locationHeading?.message,
                mapEmbedUrl: errors.homepage?.mapEmbedUrl?.message,
                ctaHeading: errors.homepage?.ctaHeading?.message,
                ctaLabel: errors.homepage?.ctaLabel?.message,
                ctaHref: errors.homepage?.ctaHref?.message,
              }}
              onChange={(next) => setValue('homepage', next)}
            />
          )}
          {contentType === 'about' && (
            <AboutEditor
              value={about}
              errors={{
                missionBody: errors.about?.missionBody?.message,
                historyBody: errors.about?.historyBody?.message,
                services: errors.about?.services?.message,
              }}
              onChange={(next) => setValue('about', next)}
            />
          )}
          {contentType === 'contact' && (
            <AdminFormField
              label="Google Maps embed URL"
              id="cms-contact-map"
              maxLength={2048}
              hint='In Google Maps: Share, then Embed a map, then copy the link inside src="...".'
              error={errors.contactMapEmbedUrl?.message}
              {...register('contactMapEmbedUrl')}
            />
          )}
          {contentType === 'volunteer' && (
            <VolunteerRolesEditor
              value={volunteerRoles}
              error={errors.volunteerRoles?.message}
              onChange={(next) => setValue('volunteerRoles', next)}
            />
          )}
          {contentType === 'team' && (
            <TeamMembersEditor
              value={teamMembers}
              error={errors.teamMembers?.message}
              onChange={(next) => setValue('teamMembers', next)}
              approved={teamContentApproved}
              onApprovalChange={(next) => setValue('teamContentApproved', next)}
            />
          )}
          <Button type="submit" disabled={isSubmitting} className="min-h-11">
            <Save aria-hidden="true" />{' '}
            {isSubmitting ? 'Saving…' : page ? 'Save changes' : 'Create draft'}
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
              description={`${page.title} and its localized SEO metadata will be permanently removed. This action is audited.`}
              confirmLabel="Delete page"
              onConfirm={remove}
            >
              Delete page
            </ConfirmedActionButton>
          </div>
          {scheduleOpen && (
            <div className="mt-5 flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-start">
              <div className="flex-1">
                <label
                  htmlFor="cms-scheduled-at"
                  className="text-heading mb-2 block text-sm font-semibold"
                >
                  Local publication date and time
                </label>
                <input
                  id="cms-scheduled-at"
                  type="datetime-local"
                  value={scheduledLocal}
                  aria-invalid={Boolean(scheduleError)}
                  aria-describedby={scheduleError ? 'cms-scheduled-at-error' : undefined}
                  onChange={(event) => {
                    setScheduledLocal(event.target.value);
                    setScheduleError('');
                  }}
                  className="min-h-11 w-full rounded-lg border bg-white px-3"
                />
                {scheduleError && (
                  <p
                    id="cms-scheduled-at-error"
                    role="alert"
                    className="text-destructive mt-1 text-sm"
                  >
                    {scheduleError}
                  </p>
                )}
              </div>
              <Button
                type="button"
                className="mt-9"
                disabled={busy}
                onClick={() => void schedule()}
              >
                Confirm schedule
              </Button>
              <p className="text-foreground mt-9 text-xs sm:max-w-48">
                Your local selection is converted to an ISO timestamp before transmission.
              </p>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
