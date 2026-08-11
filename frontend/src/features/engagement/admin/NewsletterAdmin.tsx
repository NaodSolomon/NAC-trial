'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { deleteNewsletterSubscriber, listNewsletterSubscribers } from './engagement-admin.client';
import type { NewsletterSubscriber } from './engagement-admin.schemas';
import { EngagementHeading, LanguageFilter, ListPager, LoadState } from './EngagementAdminParts';

export function NewsletterAdmin() {
  const [records, setRecords] = useState<NewsletterSubscriber[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [language, setLanguage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const { notify } = useAdminFeedback();
  const visibleRecords = useMemo(
    () => (language ? records.filter((record) => record.languageCode === language) : records),
    [records, language],
  );
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError('');
      try {
        const result = await listNewsletterSubscribers({ page, signal });
        setRecords(result.data);
        setPages(Math.max(1, result.meta.totalPages));
      } catch (cause) {
        if (!signal?.aborted) setError(getApiErrorMessageWithDetails(cause));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  async function remove(record: NewsletterSubscriber) {
    await deleteNewsletterSubscriber(record.email);
    setRecords((current) => current.filter((item) => item.id !== record.id));
    await queryClient.invalidateQueries({ queryKey: queryKeys.engagement.adminNewsletter() });
    notify({
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
      <LoadState loading={loading} error={error} empty={visibleRecords.length === 0}>
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
