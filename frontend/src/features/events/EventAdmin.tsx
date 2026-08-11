'use client';
import { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, Download, FilePlus2, Save, Trash2, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuthStore } from '@/store/auth.store';
import { calendarDownloadHref } from './event.utils';
import {
  createEvent,
  deleteEvent,
  exportEventRsvps,
  listAdminEvents,
  listEventRsvps,
  updateEvent,
} from './event-admin.client';
import {
  emptyEventEditor,
  eventEditorFromEvent,
  eventEditorSchema,
  type AdminEvent,
  type EventEditorValues,
  type EventRsvp,
} from './event-admin.schemas';

export function EventAdmin() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [selected, setSelected] = useState<AdminEvent | null>(null);
  const [values, setValues] = useState<EventEditorValues>(emptyEventEditor);
  const [rsvps, setRsvps] = useState<EventRsvp[]>([]);
  const [rsvpPages, setRsvpPages] = useState(1);
  const [rsvpPage, setRsvpPage] = useState(1);
  const [showRsvps, setShowRsvps] = useState(false);
  const [language, setLanguage] = useState('');
  const [status, setStatus] = useState('');
  const [timeframe, setTimeframe] = useState('all');
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
        const result = await listAdminEvents({
          page,
          languageCode: language,
          status,
          timeframe,
          signal,
        });
        setEvents(result.data);
        setPages(Math.max(1, result.meta.totalPages));
      } catch (loadError) {
        if (!signal?.aborted) setError(getApiErrorMessageWithDetails(loadError));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, language, status, timeframe],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    if (!selected || !showRsvps) return;
    const controller = new AbortController();
    void listEventRsvps(selected.id, rsvpPage, controller.signal)
      .then((result) => {
        setRsvps(result.data);
        setRsvpPages(Math.max(1, result.meta.totalPages));
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(getApiErrorMessageWithDetails(loadError));
      });
    return () => controller.abort();
  }, [selected, showRsvps, rsvpPage]);
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    await load();
  }
  function choose(event: AdminEvent | null) {
    setSelected(event);
    setValues(
      event
        ? eventEditorFromEvent(event)
        : { ...emptyEventEditor, languageCode: language === 'am' ? 'am' : 'en' },
    );
    setShowRsvps(false);
    setRsvps([]);
    setRsvpPage(1);
    setError('');
  }
  async function save() {
    const parsed = eventEditorSchema.safeParse(values);
    if (!parsed.success)
      return setError([...new Set(parsed.error.issues.map((issue) => issue.message))].join(' '));
    setSaving(true);
    setError('');
    try {
      const saved = selected
        ? await updateEvent(selected.id, parsed.data)
        : await createEvent(parsed.data);
      setSelected(saved);
      setValues(eventEditorFromEvent(saved));
      await refresh();
      notify({ title: selected ? 'Event updated' : 'Event created', message: saved.title });
    } catch (saveError) {
      setError(
        `${getApiErrorMessageWithDetails(saveError)} Your unsaved event remains in the editor.`,
      );
    } finally {
      setSaving(false);
    }
  }
  async function remove(event: AdminEvent) {
    await deleteEvent(event.id);
    if (selected?.id === event.id) choose(null);
    await refresh();
    notify({ title: 'Event deleted', message: event.title });
  }
  async function downloadCsv() {
    if (!selected) return;
    try {
      await exportEventRsvps(selected.id, selected.slug);
      notify({ title: 'RSVP export downloaded', message: `${selected.slug}-rsvps.csv` });
    } catch (downloadError) {
      setError(getApiErrorMessageWithDetails(downloadError));
    }
  }
  return (
    <section aria-labelledby="events-admin-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">
        Programs and attendance
      </p>
      <h1
        id="events-admin-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        Event administration
      </h1>
      <p className="text-foreground mt-2">
        Manage localized draft or published events, review private RSVPs, and export attendance as a
        real CSV file.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => choose(null)}>
          <FilePlus2 aria-hidden="true" /> New event
        </Button>
        <Filter
          label="Event language"
          value={language}
          onChange={setLanguage}
          options={[
            ['', 'All languages'],
            ['en', 'English'],
            ['am', 'Amharic'],
          ]}
        />
        <Filter
          label="Event status"
          value={status}
          onChange={setStatus}
          options={[
            ['', 'All statuses'],
            ['DRAFT', 'Draft'],
            ['PUBLISHED', 'Published'],
          ]}
        />
        <Filter
          label="Event timeframe"
          value={timeframe}
          onChange={setTimeframe}
          options={[
            ['all', 'All dates'],
            ['upcoming', 'Upcoming'],
            ['past', 'Past'],
          ]}
        />
      </div>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900"
        >
          {error}
        </p>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-[23rem_minmax(0,1fr)]">
        <aside className="bg-card h-fit rounded-xl border p-4 shadow-sm">
          <h2 className="text-heading font-semibold">Events</h2>
          {loading ? (
            <p role="status" className="mt-4">
              Loading events…
            </p>
          ) : events.length === 0 ? (
            <p className="mt-4 text-sm">No events match these filters.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {events.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => choose(event)}
                    className={`w-full rounded-lg border p-3 text-left ${selected?.id === event.id ? 'border-primary bg-green-50' : ''}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{event.title}</span>
                      <AdminStatusBadge status={event.status} />
                    </span>
                    <span className="text-foreground mt-1 block text-xs">
                      {new Date(event.startDate).toLocaleDateString()} ·{' '}
                      {event.languageCode.toUpperCase()}
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
        <div className="space-y-6">
          <form
            className="bg-card space-y-5 rounded-xl border p-6 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-heading font-serif text-2xl font-semibold">
                {selected ? `Edit ${selected.title}` : 'Create event'}
              </h2>
              {selected && <AdminStatusBadge status={selected.status} />}
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
              <Field
                label="Title"
                value={values.title}
                maxLength={255}
                onChange={(title) => setValues({ ...values, title })}
              />
              <Field
                label="Location"
                value={values.location}
                maxLength={500}
                onChange={(location) => setValues({ ...values, location })}
              />
              <DateField
                label="Start date and time"
                value={values.startDate}
                onChange={(startDate) => setValues({ ...values, startDate })}
              />
              <DateField
                label="End date and time"
                value={values.endDate}
                onChange={(endDate) => setValues({ ...values, endDate })}
              />
            </div>
            <label>
              <span className="text-heading mb-2 block text-sm font-semibold">Description</span>
              <textarea
                value={values.description}
                maxLength={10000}
                rows={8}
                onChange={(event) => setValues({ ...values, description: event.target.value })}
                className="w-full rounded-lg border p-3"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="text-heading mb-2 block text-sm font-semibold">
                  Publication status
                </span>
                <select
                  value={values.status}
                  onChange={(event) =>
                    setValues({ ...values, status: event.target.value as 'DRAFT' | 'PUBLISHED' })
                  }
                  className="min-h-11 w-full rounded-lg border bg-white px-3"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-3 self-end">
                <input
                  type="checkbox"
                  checked={values.rsvpEnabled}
                  onChange={(event) => setValues({ ...values, rsvpEnabled: event.target.checked })}
                  className="size-5"
                />{' '}
                Enable public RSVP
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                <Save aria-hidden="true" />
                {saving ? 'Saving…' : selected ? 'Save event' : 'Create event'}
              </Button>
              {selected?.status === 'PUBLISHED' && (
                <a
                  href={calendarDownloadHref(selected.slug, selected.languageCode)}
                  download={`${selected.slug}.ics`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 font-semibold"
                >
                  <CalendarPlus aria-hidden="true" className="size-4" /> Download iCal
                </a>
              )}
              {selected && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRsvps((value) => !value)}
                >
                  <Users aria-hidden="true" /> {showRsvps ? 'Hide RSVPs' : 'Review RSVPs'}
                </Button>
              )}
              {selected && role === 'SUPER_ADMIN' && (
                <ConfirmedActionButton
                  title="Delete event?"
                  description="The event and all associated RSVP records will be permanently removed."
                  confirmLabel="Delete event"
                  onConfirm={() => remove(selected)}
                >
                  <Trash2 aria-hidden="true" /> Delete
                </ConfirmedActionButton>
              )}
            </div>
          </form>
          {selected && showRsvps && (
            <section
              aria-labelledby="rsvp-review-heading"
              className="bg-card rounded-xl border p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2
                    id="rsvp-review-heading"
                    className="text-heading font-serif text-2xl font-semibold"
                  >
                    RSVP review
                  </h2>
                  <p className="text-foreground text-sm">
                    Private attendee information for {selected.title}.
                  </p>
                </div>
                <Button type="button" onClick={() => void downloadCsv()}>
                  <Download aria-hidden="true" /> Export CSV
                </Button>
              </div>
              {rsvps.length === 0 ? (
                <p role="status" className="mt-5 rounded-lg bg-slate-50 p-5">
                  No RSVP responses yet.
                </p>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-3">Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Attendees</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rsvps.map((rsvp) => (
                        <tr key={rsvp.id} className="border-b">
                          <td className="p-3">{rsvp.name}</td>
                          <td className="p-3">{rsvp.email}</td>
                          <td className="p-3">{rsvp.attendees}</td>
                          <td className="p-3">
                            <AdminStatusBadge status={rsvp.status} />
                          </td>
                          <td className="p-3">{new Date(rsvp.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-4 flex justify-between">
                <Button
                  variant="outline"
                  disabled={rsvpPage <= 1}
                  onClick={() => setRsvpPage((value) => value - 1)}
                >
                  Previous RSVPs
                </Button>
                <span className="text-sm">
                  Page {rsvpPage} of {rsvpPages}
                </span>
                <Button
                  variant="outline"
                  disabled={rsvpPage >= rsvpPages}
                  onClick={() => setRsvpPage((value) => value + 1)}
                >
                  Next RSVPs
                </Button>
              </div>
            </section>
          )}
        </div>
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
function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-heading mb-2 block text-sm font-semibold">{label}</span>
      <input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border px-3"
      />
    </label>
  );
}
function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-lg border bg-white px-3"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
