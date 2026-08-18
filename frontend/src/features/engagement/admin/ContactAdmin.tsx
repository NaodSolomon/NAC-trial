'use client';

import { useCallback, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { Button } from '@/components/ui/button';
import { queryKeys } from '@/lib/api/query-keys';
import { useAdminActions } from '@/hooks/use-admin-actions';
import { useAuthStore } from '@/store/auth.store';
import { useAdminList } from '@/hooks/use-admin-list';
import { deleteContactSubmission, listContactSubmissions } from './engagement-admin.client';
import type { ContactSubmission } from './engagement-admin.schemas';
import { EngagementHeading, LanguageFilter, ListPager, LoadState } from './EngagementAdminParts';

export function ContactAdmin() {
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
  } = useAdminList<ContactSubmission>(
    useCallback(
      ({ page, signal }) =>
        listContactSubmissions({ page, languageCode: language, search, signal }),
      [language, search],
    ),
  );
  const { run } = useAdminActions({
    reload: load,
    queryKey: queryKeys.engagement.all,
  });

  async function remove(id: string) {
    await run(() => deleteContactSubmission(id), {
      title: 'Contact submission deleted',
      message: 'The cached record was removed.',
    });
  }
  return (
    <section aria-labelledby="contact-admin-heading">
      <div>
        <EngagementHeading
          id="contact-admin-heading"
          eyebrow="Private engagement"
          title="Contact submissions"
          description="Review messages submitted through the public contact form. Personal details are visible only inside this authorized workspace."
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
          <span className="sr-only">Search contact submissions</span>
          <Search aria-hidden="true" className="absolute top-3 left-3 size-5 text-slate-500" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            maxLength={100}
            placeholder="Search name, email or subject"
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
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
      </form>
      <LoadState
        loading={loading}
        error={error}
        empty={records.length === 0}
        entity="contact submissions"
        filtered={Boolean(language || search)}
        onClearFilters={() => {
          setLanguage('');
          setSearch('');
        }}
      >
        <ul className="mt-6 grid gap-4">
          {records.map((record) => (
            <li key={record.id} className="bg-card rounded-xl border p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div className="min-w-0">
                  <h2 className="text-heading text-lg font-semibold">
                    {record.subject || 'Contact enquiry'}
                  </h2>
                  <p className="mt-1 font-medium">{record.name}</p>
                  <a
                    href={`mailto:${record.email}`}
                    className="text-primary mt-1 inline-block break-all underline"
                  >
                    {record.email}
                  </a>
                  <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">{record.message}</p>
                  <p className="mt-4 text-xs text-slate-600">
                    {record.languageCode.toUpperCase()} ·{' '}
                    {new Date(record.createdAt).toLocaleString()}
                  </p>
                </div>
                {role === 'SUPER_ADMIN' && (
                  <ConfirmedActionButton
                    title="Delete contact submission?"
                    description="This permanently removes the selected submission. The submitter's identity is intentionally omitted from operational feedback."
                    confirmLabel="Delete submission"
                    onConfirm={() => remove(record.id)}
                    className="self-start"
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
