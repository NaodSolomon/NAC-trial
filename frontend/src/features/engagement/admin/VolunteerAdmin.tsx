'use client';

import { useCallback, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { Button } from '@/components/ui/button';
import { queryKeys } from '@/lib/api/query-keys';
import { useAdminActions } from '@/hooks/use-admin-actions';
import { useAuthStore } from '@/store/auth.store';
import { useAdminList } from '@/hooks/use-admin-list';
import { deleteVolunteerApplication, listVolunteerApplications } from './engagement-admin.client';
import type { VolunteerApplication } from './engagement-admin.schemas';
import { EngagementHeading, LanguageFilter, ListPager, LoadState } from './EngagementAdminParts';

export function VolunteerAdmin() {
  const [status, setStatus] = useState('');
  const [language, setLanguage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const role = useAuthStore((state) => state.user?.role);
  const {
    records,
    page,
    setPage,
    pages,
    loading,
    error,
    reload: load,
  } = useAdminList<VolunteerApplication>(
    useCallback(
      ({ page, signal }) =>
        listVolunteerApplications({ page, languageCode: language, search, status, signal }),
      [language, search, status],
    ),
  );
  const { run } = useAdminActions({
    reload: load,
    queryKey: queryKeys.engagement.all,
  });

  async function remove(id: string) {
    await run(() => deleteVolunteerApplication(id), {
      title: 'Volunteer application deleted',
      message: 'The cached record was removed.',
    });
  }
  return (
    <section aria-labelledby="volunteer-admin-heading">
      <div>
        <EngagementHeading
          id="volunteer-admin-heading"
          eyebrow="Private engagement"
          title="Volunteer applications"
          description="Review applicant interests and contact details. Only super administrators can permanently delete applications."
        />
      </div>
      <form
        className="mt-6 flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
      >
        <label className="relative min-w-64 flex-1">
          <span className="sr-only">Search volunteer applications</span>
          <Search aria-hidden="true" className="absolute top-3 left-3 size-5 text-slate-500" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            maxLength={100}
            placeholder="Search applicant or role interest"
            className="min-h-11 w-full rounded-lg border bg-white pr-3 pl-10"
          />
        </label>
        <LanguageFilter
          value={language}
          onChange={(value) => {
            setLanguage(value);
            setPage(1);
          }}
        />
        <select
          aria-label="Application status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="min-h-11 rounded-lg border bg-white px-3"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
      </form>
      <LoadState
        loading={loading}
        error={error}
        empty={records.length === 0}
        entity="volunteer applications"
        filtered={Boolean(language || search || status)}
        onClearFilters={() => {
          setLanguage('');
          setSearch('');
          setStatus('');
        }}
      >
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {records.map((record) => (
            <li key={record.id} className="bg-card rounded-xl border p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-heading text-lg font-semibold">{record.name}</h2>
                  <p className="mt-1 text-sm font-medium">{record.roleInterest}</p>
                </div>
                <AdminStatusBadge status={record.status} />
              </div>
              <dl className="mt-4 grid gap-2 text-sm">
                <div>
                  <dt className="font-semibold">Email</dt>
                  <dd>
                    <a href={`mailto:${record.email}`} className="text-primary break-all underline">
                      {record.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Phone</dt>
                  <dd>
                    <a href={`tel:${record.phone}`} className="text-primary underline">
                      {record.phone}
                    </a>
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-6 whitespace-pre-wrap">{record.message}</p>
              <div className="mt-5 flex items-end justify-between gap-3">
                <p className="text-xs text-slate-600">
                  {record.languageCode.toUpperCase()} ·{' '}
                  {new Date(record.createdAt).toLocaleString()}
                </p>
                {role === 'SUPER_ADMIN' && (
                  <ConfirmedActionButton
                    title="Delete volunteer application?"
                    description="This permanently removes the selected application. Operational feedback will not include applicant details."
                    confirmLabel="Delete application"
                    onConfirm={() => remove(record.id)}
                  >
                    <Trash2 aria-hidden="true" /> Delete
                  </ConfirmedActionButton>
                )}
              </div>
            </li>
          ))}
        </ul>
        <ListPager page={page} pages={pages} onPage={setPage} />
      </LoadState>
    </section>
  );
}
