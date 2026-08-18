'use client';

import { useCallback, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { queryKeys } from '@/lib/api/query-keys';
import { useAdminActions } from '@/hooks/use-admin-actions';
import { useAdminList } from '@/hooks/use-admin-list';
import { deleteNewsletterSubscriber, listNewsletterSubscribers } from './engagement-admin.client';
import type { NewsletterSubscriber } from './engagement-admin.schemas';
import { EngagementHeading, LanguageFilter, ListPager, LoadState } from './EngagementAdminParts';

export function NewsletterAdmin() {
  const [language, setLanguage] = useState('');
  const {
    records,
    page,
    setPage,
    pages,
    loading,
    error,
    reload: load,
  } = useAdminList<NewsletterSubscriber>(
    useCallback(({ page, signal }) => listNewsletterSubscribers({ page, signal }), []),
  );
  const visibleRecords = useMemo(
    () => (language ? records.filter((record) => record.languageCode === language) : records),
    [records, language],
  );
  const { run } = useAdminActions({
    reload: load,
    queryKey: queryKeys.engagement.all,
  });

  async function remove(record: NewsletterSubscriber) {
    await run(() => deleteNewsletterSubscriber(record.email), {
      title: 'Newsletter subscriber removed',
      message: 'The cached record was removed without including personal data.',
    });
  }
  return (
    <section aria-labelledby="newsletter-heading">
      <div>
        <EngagementHeading
          id="newsletter-heading"
          eyebrow="Super administrator only"
          title="Newsletter subscribers"
          description="Subscriber addresses are intentionally confined to this authorized screen and are never sent to analytics, notifications, client logs or persistent browser storage."
        />
      </div>
      <div className="mt-6">
        <LanguageFilter value={language} onChange={setLanguage} />
        <p className="mt-2 text-xs text-slate-600">
          Language filters the current page; server-side pagination remains authoritative.
        </p>
      </div>
      <LoadState
        loading={loading}
        error={error}
        empty={visibleRecords.length === 0}
        entity="subscribers"
        filtered={Boolean(language)}
        onClearFilters={() => setLanguage('')}
      >
        <div className="mt-6 overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4">Subscriber</th>
                <th className="p-4">Language</th>
                <th className="p-4">Subscribed</th>
                <th className="p-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((record) => (
                <tr key={record.id} className="border-t">
                  <td className="p-4">
                    <span className="break-all">{record.email}</span>
                  </td>
                  <td className="p-4">{record.languageCode.toUpperCase()}</td>
                  <td className="p-4">{new Date(record.createdAt).toLocaleString()}</td>
                  <td className="p-4 text-right">
                    <ConfirmedActionButton
                      title="Remove newsletter subscriber?"
                      description="The selected subscriber will be removed. Their address is omitted from feedback and operational logging."
                      confirmLabel="Remove subscriber"
                      onConfirm={() => remove(record)}
                    >
                      <Trash2 aria-hidden="true" /> Remove
                    </ConfirmedActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ListPager page={page} pages={pages} onPage={setPage} />
      </LoadState>
    </section>
  );
}
