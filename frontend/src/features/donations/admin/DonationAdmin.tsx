'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, ExternalLink, FlaskConical, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { Button } from '@/components/ui/button';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuthStore } from '@/store/auth.store';
import {
  exportDonations,
  getAdminDonation,
  getDonationReceipt,
  getDonationRuntime,
  getDonationStats,
  listAdminDonations,
  resendDonationReceipt,
  verifyDonation,
} from './donation-admin.client';
import type { AdminDonation, DonationRuntime } from './donation-admin.schemas';

interface Stats {
  totalDonations: number;
  totals: Array<{ currency: string; amount: string }>;
}

export function DonationAdmin() {
  const [records, setRecords] = useState<AdminDonation[]>([]);
  const [selected, setSelected] = useState<AdminDonation | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [runtime, setRuntime] = useState<DonationRuntime | null>(null);
  const [stats, setStats] = useState<Stats>({ totalDonations: 0, totals: [] });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [currency, setCurrency] = useState('');
  const [gateway, setGateway] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const role = useAuthStore((state) => state.user?.role);
  const queryClient = useQueryClient();
  const { notify } = useAdminFeedback();
  const trialMode = runtime?.mode === 'trial';

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError('');
      try {
        const [list, summary, runtimeInfo] = await Promise.all([
          listAdminDonations({ page, status, currency, gateway, signal }),
          getDonationStats(signal),
          getDonationRuntime(signal),
        ]);
        if (signal?.aborted) return;
        setRecords(list.data);
        setPages(Math.max(1, list.meta.totalPages));
        setStats(summary);
        setRuntime(runtimeInfo);
      } catch (cause) {
        if (!signal?.aborted) setError(getApiErrorMessageWithDetails(cause));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, status, currency, gateway],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function selectDonation(id: string) {
    setDetailLoading(true);
    setError('');
    setReceiptUrl('');
    try {
      setSelected(await getAdminDonation(id));
    } catch (cause) {
      setError(getApiErrorMessageWithDetails(cause));
    } finally {
      setDetailLoading(false);
    }
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.donations.all });
    await load();
  }

  async function viewReceipt(id: string) {
    try {
      const receipt = await getDonationReceipt(id);
      setReceiptUrl(receipt.receiptUrl);
      notify({
        title: 'Test receipt ready',
        message: trialMode
          ? 'This document records a simulated confirmation only.'
          : 'The receipt is ready to view.',
        tone: 'info',
      });
    } catch (cause) {
      setError(getApiErrorMessageWithDetails(cause));
    }
  }

  async function resend(id: string) {
    await resendDonationReceipt(id);
    notify({
      title: trialMode ? 'Test receipt queued' : 'Receipt queued',
      message: trialMode
        ? 'Mailpit will receive a simulated receipt. No financial settlement occurred.'
        : 'The receipt delivery was queued.',
    });
  }

  async function verify(id: string) {
    await verifyDonation(id);
    await refresh();
    if (selected?.id === id) setSelected(await getAdminDonation(id));
    notify({
      title: 'Donation status verified',
      message: 'The authoritative record was refreshed.',
    });
  }

  async function exportCsv() {
    setExporting(true);
    setError('');
    try {
      await exportDonations({ status, currency, gateway });
      notify({
        title: trialMode ? 'Simulation CSV downloaded' : 'Donation CSV downloaded',
        message: 'The export uses the active list filters.',
      });
    } catch (cause) {
      setError(getApiErrorMessageWithDetails(cause));
    } finally {
      setExporting(false);
    }
  }

  return (
    <section aria-labelledby="donations-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">
        Finance workspace
      </p>
      <h1
        id="donations-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        Donation records
      </h1>
      <p className="text-foreground mt-2 max-w-3xl">
        Review payment demonstrations, status history, test receipts and filtered exports.
      </p>

      {runtime && <FinanceModeBanner runtime={runtime} />}

      <section aria-labelledby="donation-statistics-heading" className="mt-6">
        <h2 id="donation-statistics-heading" className="sr-only">
          Donation statistics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label={trialMode ? 'Simulated confirmations' : 'Confirmed records'}
            value={stats.totalDonations.toLocaleString()}
          />
          {stats.totals.map((total) => (
            <StatCard
              key={total.currency}
              label={
                trialMode
                  ? `Simulated ${total.currency} amount`
                  : `${total.currency} recorded amount`
              }
              value={`${total.amount} ${total.currency}`}
            />
          ))}
        </div>
        {trialMode && (
          <p className="mt-3 text-sm font-medium text-amber-900">
            These amounts are demonstration records. They are not revenue, settlement, or funds
            collected.
          </p>
        )}
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Filter
          label="Donation status"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={['', 'INITIATED', 'PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED']}
        />
        <Filter
          label="Currency"
          value={currency}
          onChange={(value) => {
            setCurrency(value);
            setPage(1);
          }}
          options={['', 'USD', 'ETB']}
        />
        <Filter
          label="Gateway"
          value={gateway}
          onChange={(value) => {
            setGateway(value);
            setPage(1);
          }}
          options={['', 'SIMULATED', 'PAYPAL', 'TELEBIRR', 'CBE']}
        />
        <Button
          type="button"
          variant="outline"
          disabled={exporting}
          onClick={() => void exportCsv()}
        >
          <Download aria-hidden="true" /> {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="mt-6">
          Loading donation records…
        </p>
      ) : error ? null : records.length === 0 ? (
        <AdminEmptyState
          entity="donation records"
          filtered={Boolean(status || currency || gateway)}
          onClearFilters={() => {
            setStatus('');
            setCurrency('');
            setGateway('');
          }}
        />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4">Reference</th>
                <th className="p-4">Donor</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created</th>
                <th className="p-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-t">
                  <td className="p-4 font-mono text-xs">{record.id.slice(0, 8)}</td>
                  <td className="p-4">
                    <span className="block font-medium">{record.donorName}</span>
                    <span className="block text-xs break-all">{record.donorEmail}</span>
                  </td>
                  <td className="p-4 font-semibold">
                    {record.amount} {record.currency}
                  </td>
                  <td className="p-4">
                    <AdminStatusBadge status={record.status} />
                  </td>
                  <td className="p-4">{new Date(record.createdAt).toLocaleString()}</td>
                  <td className="p-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void selectDonation(record.id)}
                    >
                      View details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav aria-label="Donation pagination" className="mt-5 flex items-center justify-between">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {page} of {pages}
        </span>
        <Button
          variant="outline"
          disabled={page >= pages}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </Button>
      </nav>

      {(detailLoading || selected) && (
        <section
          aria-labelledby="donation-detail-heading"
          className="bg-card mt-8 rounded-xl border p-5 shadow-sm"
        >
          <h2 id="donation-detail-heading" className="text-heading text-2xl font-semibold">
            Donation detail
          </h2>
          {detailLoading || !selected ? (
            <p role="status" className="mt-4">
              Loading detail…
            </p>
          ) : (
            <>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Reference" value={selected.id} mono />
                <Detail label="Donor" value={selected.donorName} />
                <Detail label="Email" value={selected.donorEmail} />
                <Detail label="Amount" value={`${selected.amount} ${selected.currency}`} />
                <Detail label="Gateway label" value={selected.gateway} />
                <Detail label="Status" value={selected.status} />
                <Detail
                  label="Provider order"
                  value={selected.providerOrderId ?? 'Not assigned'}
                  mono
                />
                <Detail
                  label="External transaction"
                  value={selected.externalTransactionId ?? 'Not assigned'}
                  mono
                />
                <Detail
                  label="Confirmed"
                  value={
                    selected.confirmedAt
                      ? new Date(selected.confirmedAt).toLocaleString()
                      : 'Not confirmed'
                  }
                />
              </dl>
              {selected.message && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold">Donor message</h3>
                  <p className="mt-1 whitespace-pre-wrap">{selected.message}</p>
                </div>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {selected.status === 'CONFIRMED' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void viewReceipt(selected.id)}
                    >
                      <ExternalLink aria-hidden="true" /> Prepare receipt
                    </Button>
                    <ConfirmedActionButton
                      destructive={false}
                      title="Resend receipt?"
                      description={
                        trialMode
                          ? 'This queues a simulated receipt to the local mail adapter. It does not represent a real payment.'
                          : 'This queues a receipt email for the donor.'
                      }
                      confirmLabel="Queue receipt"
                      onConfirm={() => resend(selected.id)}
                    >
                      <Mail aria-hidden="true" /> Resend receipt
                    </ConfirmedActionButton>
                  </>
                )}
                {!trialMode && role === 'SUPER_ADMIN' && selected.status === 'PENDING' && (
                  <ConfirmedActionButton
                    destructive={false}
                    title="Verify donation status?"
                    description="Use this only after independently confirming the provider status."
                    confirmLabel="Verify status"
                    onConfirm={() => verify(selected.id)}
                  >
                    <ShieldCheck aria-hidden="true" /> Verify
                  </ConfirmedActionButton>
                )}
                <Button type="button" variant="ghost" onClick={() => void refresh()}>
                  <RefreshCw aria-hidden="true" /> Refresh
                </Button>
              </div>
              {receiptUrl && (
                <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4">
                  <strong>{trialMode ? 'Simulated receipt:' : 'Receipt:'}</strong>{' '}
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary inline-flex items-center gap-1 break-all underline"
                  >
                    Open receipt PDF <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                </p>
              )}
            </>
          )}
        </section>
      )}
    </section>
  );
}

function FinanceModeBanner({ runtime }: { runtime: DonationRuntime }) {
  const trial = runtime.mode === 'trial';
  const paymentsDisabled = !trial && !runtime.realPaymentsEnabled;
  return (
    <aside
      aria-label="Donation environment"
      className={`mt-6 rounded-xl border p-4 ${trial ? 'border-amber-400 bg-amber-100 text-amber-950' : 'border-blue-300 bg-blue-50 text-blue-950'}`}
    >
      <div className="flex items-start gap-3">
        <FlaskConical aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div>
          <h2 className="font-semibold">
            {trial
              ? 'Trial finance data — no real money collected'
              : paymentsDisabled
                ? 'Production payments are disabled'
                : 'Production payment records'}
          </h2>
          <p className="mt-1 text-sm">
            {trial
              ? 'All confirmations, totals and receipts on this screen are simulations generated by the fake payment adapter.'
              : paymentsDisabled
                ? 'Existing records are not proof of settlement. Reconcile them independently before financial reporting.'
                : 'Payments are enabled. Reconcile all records against the configured provider before financial reporting.'}
          </p>
        </div>
      </div>
    </aside>
  );
}
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="bg-card rounded-xl border p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="text-heading mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}
function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-slate-600">{label}</dt>
      <dd className={`mt-1 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
function Filter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-11 rounded-lg border bg-white px-3"
    >
      {options.map((option) => (
        <option key={option || 'all'} value={option}>
          {option || `All ${label.toLowerCase()}s`}
        </option>
      ))}
    </select>
  );
}
