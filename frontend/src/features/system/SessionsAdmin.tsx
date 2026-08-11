'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ban, ShieldX } from 'lucide-react';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { Button } from '@/components/ui/button';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { listAdminSessions, revokeSession } from './system.client';
import type { AdminSession } from './system.schemas';

export function SessionsAdmin() {
  const [records, setRecords] = useState<AdminSession[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('active');
  const [adminIdInput, setAdminIdInput] = useState('');
  const [adminId, setAdminId] = useState('');
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState('');
  const { notify } = useAdminFeedback();
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError('');
      try {
        const result = await listAdminSessions({ page, status, adminId, signal });
        setRecords(result.data);
        setPages(Math.max(1, result.meta.totalPages));
      } catch (cause) {
        if (!signal?.aborted) setError(getApiErrorMessageWithDetails(cause));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, status, adminId],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  async function revoke(target: { sessionId: string } | { adminId: string }) {
    if (revoking) return;
    setRevoking(true);
    setError('');
    try {
      const result = await revokeSession(target);
      notify({
        title: 'Session revocation completed',
        message: `${result.revokedCount} session${result.revokedCount === 1 ? '' : 's'} revoked.`,
      });
      await load();
    } catch (cause) {
      setError(getApiErrorMessageWithDetails(cause));
      throw cause;
    } finally {
      setRevoking(false);
    }
  }
  return (
    <section aria-labelledby="sessions-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">
        Authentication security
      </p>
      <h1
        id="sessions-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        Administrator sessions
      </h1>
      <p className="mt-2 max-w-3xl">
        Inspect safe device summaries and revoke one suspicious session or every session for an
        account. Refresh tokens, token hashes, raw IP addresses, and token-family identifiers are
        never displayed.
      </p>
      <form
        className="mt-6 flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setAdminId(adminIdInput.trim());
        }}
      >
        <label className="min-w-64 flex-1">
          <span className="sr-only">Filter by administrator ID</span>
          <input
            value={adminIdInput}
            onChange={(event) => setAdminIdInput(event.target.value)}
            placeholder="Administrator UUID"
            className="min-h-11 w-full rounded-lg border px-3"
          />
        </label>
        <select
          aria-label="Session status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="min-h-11 rounded-lg border bg-white px-3"
        >
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
          <option value="all">All sessions</option>
        </select>
        <Button type="submit" variant="outline">
          Apply filter
        </Button>
      </form>
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
          Loading sessions…
        </p>
      ) : records.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed p-6 text-center">
          No sessions match these filters.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {records.map((session) => (
            <li key={session.id} className="bg-card rounded-xl border p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 lg:flex-row">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-heading text-lg font-semibold">{session.admin.name}</h2>
                    <Status status={session.status} />
                  </div>
                  <p className="mt-1 text-sm break-all">{session.admin.email}</p>
                  <p className="mt-3 text-sm break-words">
                    <strong>Device:</strong> {session.userAgent ?? 'Unknown browser'}
                  </p>
                  <p className="mt-1 text-sm">
                    <strong>IP fingerprint:</strong>{' '}
                    <span className="font-mono">{session.ipFingerprint ?? 'Unavailable'}</span>
                  </p>
                  <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="font-semibold">Created</dt>
                      <dd>{new Date(session.createdAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Last used</dt>
                      <dd>{new Date(session.lastUsedAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Expires</dt>
                      <dd>{new Date(session.expiresAt).toLocaleString()}</dd>
                    </div>
                  </dl>
                </div>
                {session.status === 'ACTIVE' && (
                  <div className="flex shrink-0 flex-wrap items-start gap-3">
                    <ConfirmedActionButton
                      disabled={revoking}
                      title="Revoke this session?"
                      description="The selected device will immediately lose access and its refresh token will be rejected."
                      confirmLabel="Revoke session"
                      onConfirm={() => revoke({ sessionId: session.id })}
                    >
                      <Ban aria-hidden="true" /> Revoke device
                    </ConfirmedActionButton>
                    <ConfirmedActionButton
                      disabled={revoking}
                      title="Revoke all administrator sessions?"
                      description="Every active device for this administrator will be signed out, including the current device if it belongs to the selected account."
                      confirmLabel="Revoke all sessions"
                      onConfirm={() => revoke({ adminId: session.admin.id })}
                    >
                      <ShieldX aria-hidden="true" /> Revoke all
                    </ConfirmedActionButton>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <nav aria-label="Session pagination" className="mt-5 flex items-center justify-between">
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
    </section>
  );
}

function Status({ status }: { status: AdminSession['status'] }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${status === 'ACTIVE' ? 'bg-green-100 text-green-900' : status === 'REVOKED' ? 'bg-red-100 text-red-900' : 'bg-slate-200 text-slate-800'}`}
    >
      {status}
    </span>
  );
}
