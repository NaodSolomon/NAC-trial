'use client';

import { useCallback, useEffect, useState } from 'react';
import { Filter as FilterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { listAuditLogs } from './system.client';
import { safeAuditMetadata } from './safe-audit-metadata';
import type { AuditLog } from './system.schemas';

export function AuditLogsAdmin() {
  const [records, setRecords] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [draft, setDraft] = useState({ adminId: '', entityType: '', action: '', from: '', to: '' });
  const [filters, setFilters] = useState(draft);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError('');
      try {
        const result = await listAuditLogs({
          page,
          adminId: filters.adminId.trim(),
          entityType: filters.entityType.trim(),
          action: filters.action.trim(),
          from: toBoundary(filters.from, false),
          to: toBoundary(filters.to, true),
          signal,
        });
        setRecords(result.data);
        setPages(Math.max(1, result.meta.totalPages));
      } catch (cause) {
        if (!signal?.aborted) setError(getApiErrorMessageWithDetails(cause));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, filters],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  return (
    <section aria-labelledby="audit-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">
        Immutable security history
      </p>
      <h1
        id="audit-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        Audit logs
      </h1>
      <p className="mt-2 max-w-3xl">
        Filter administrative actions without rendering arbitrary metadata. Secret-like and
        unrecognized metadata fields are omitted from this interface.
      </p>
      <form
        className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setFilters({ ...draft });
        }}
      >
        <Field
          label="Administrator ID"
          value={draft.adminId}
          onChange={(adminId) => setDraft((current) => ({ ...current, adminId }))}
          placeholder="UUID"
        />
        <Field
          label="Entity type"
          value={draft.entityType}
          onChange={(entityType) => setDraft((current) => ({ ...current, entityType }))}
          placeholder="CMS_PAGE"
        />
        <Field
          label="Action"
          value={draft.action}
          onChange={(action) => setDraft((current) => ({ ...current, action }))}
          placeholder="UPDATE"
        />
        <Field
          label="From date"
          type="date"
          value={draft.from}
          onChange={(from) => setDraft((current) => ({ ...current, from }))}
        />
        <Field
          label="To date"
          type="date"
          value={draft.to}
          onChange={(to) => setDraft((current) => ({ ...current, to }))}
        />
        <Button type="submit" variant="outline" className="xl:col-span-5 xl:w-fit">
          <FilterIcon aria-hidden="true" /> Apply filters
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
          Loading audit history…
        </p>
      ) : records.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed p-6 text-center">
          No audit records match these filters.
        </p>
      ) : (
        <ol className="mt-6 space-y-4">
          {records.map((record) => {
            const safeFields = safeAuditMetadata(record.metadata);
            return (
              <li key={record.id} className="bg-card rounded-xl border p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-heading font-semibold">
                      {record.action} · {record.entityType}
                    </h2>
                    <p className="mt-1 font-mono text-xs">
                      Entity: {record.entityId ?? 'No entity ID'}
                    </p>
                  </div>
                  <time className="text-sm" dateTime={record.createdAt}>
                    {new Date(record.createdAt).toLocaleString()}
                  </time>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold">Administrator ID</dt>
                    <dd className="mt-1 font-mono text-xs break-all">
                      {record.adminId ?? 'Deleted administrator'}
                    </dd>
                  </div>
                  {safeFields.map((field) => (
                    <div key={field.label}>
                      <dt className="font-semibold">{field.label}</dt>
                      <dd className="mt-1 break-words">{field.value}</dd>
                    </div>
                  ))}
                </dl>
                {safeFields.length === 0 && (
                  <p className="mt-4 text-xs text-slate-600">
                    No display-safe metadata is available.
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <nav aria-label="Audit pagination" className="mt-5 flex items-center justify-between">
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border px-3"
      />
    </label>
  );
}
function toBoundary(value: string, end: boolean) {
  return value
    ? new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}`).toISOString()
    : undefined;
}
