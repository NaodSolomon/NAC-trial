'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save, Trash2, UserPlus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { Button } from '@/components/ui/button';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuthStore } from '@/store/auth.store';
import {
  createAdministrator,
  deleteAdministrator,
  listAdministrators,
  updateAdministrator,
} from './system.client';
import {
  administratorEditorSchema,
  administratorUpdateSchema,
  emptyAdministratorEditor,
  type Administrator,
  type AdministratorEditor,
  type AdministratorUpdate,
} from './system.schemas';

const emptyUpdate: AdministratorUpdate = {
  name: '',
  role: 'CONTENT_EDITOR',
  isActive: true,
  password: '',
};

export function AdministratorsAdmin() {
  const [records, setRecords] = useState<Administrator[]>([]);
  const [selected, setSelected] = useState<Administrator | null>(null);
  const [createValues, setCreateValues] = useState<AdministratorEditor>(emptyAdministratorEditor);
  const [updateValues, setUpdateValues] = useState<AdministratorUpdate>(emptyUpdate);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const currentAdminId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const { notify } = useAdminFeedback();
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError('');
      try {
        const result = await listAdministrators({
          page,
          role: roleFilter,
          isActive: activeFilter,
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
    [page, roleFilter, activeFilter],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  function select(record: Administrator | null) {
    setSelected(record);
    setUpdateValues(
      record
        ? { name: record.name, role: record.role, isActive: record.isActive, password: '' }
        : emptyUpdate,
    );
    setError('');
  }
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.administrators.all });
    await load();
  }
  async function create() {
    const parsed = administratorEditorSchema.safeParse(createValues);
    if (!parsed.success)
      return setError([...new Set(parsed.error.issues.map((issue) => issue.message))].join(' '));
    setSaving(true);
    setError('');
    try {
      await createAdministrator(parsed.data);
      setCreateValues(emptyAdministratorEditor);
      await refresh();
      notify({
        title: 'Administrator created',
        message: 'The new account can now sign in with its assigned role.',
      });
    } catch (cause) {
      setError(getApiErrorMessageWithDetails(cause));
    } finally {
      setSaving(false);
    }
  }
  async function update() {
    if (!selected) return;
    const parsed = administratorUpdateSchema.safeParse(updateValues);
    if (!parsed.success)
      return setError([...new Set(parsed.error.issues.map((issue) => issue.message))].join(' '));
    setSaving(true);
    setError('');
    try {
      const saved = await updateAdministrator(selected.id, parsed.data);
      setSelected(saved);
      setUpdateValues({
        name: saved.name,
        role: saved.role,
        isActive: saved.isActive,
        password: '',
      });
      await refresh();
      notify({
        title: 'Administrator updated',
        message: 'Role and account protections were enforced by the backend transaction.',
      });
    } catch (cause) {
      setError(getApiErrorMessageWithDetails(cause));
    } finally {
      setSaving(false);
    }
  }
  async function remove(record: Administrator) {
    try {
      await deleteAdministrator(record.id);
      if (selected?.id === record.id) select(null);
      await refresh();
      notify({
        title: 'Administrator deleted',
        message: 'The account and its permitted dependent records were handled by the backend.',
      });
    } catch (cause) {
      setError(getApiErrorMessageWithDetails(cause));
      throw cause;
    }
  }
  return (
    <section aria-labelledby="administrators-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">
        Security administration
      </p>
      <h1
        id="administrators-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        Administrators
      </h1>
      <p className="mt-2 max-w-3xl">
        Create accounts and manage roles without exposing password hashes, lockout counters, or
        reset tokens. The final active super administrator cannot be demoted, deactivated, or
        deleted.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Filter
          label="Administrator role"
          value={roleFilter}
          options={['', 'SUPER_ADMIN', 'CONTENT_EDITOR', 'FINANCE_VIEWER']}
          onChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
        />
        <Filter
          label="Account status"
          value={activeFilter}
          options={['', 'true', 'false']}
          labels={['All statuses', 'Active', 'Inactive']}
          onChange={(value) => {
            setActiveFilter(value);
            setPage(1);
          }}
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
      <div className="mt-6 grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="bg-card h-fit rounded-xl border p-4 shadow-sm">
          <h2 className="text-heading font-semibold">Accounts</h2>
          {loading ? (
            <p role="status" className="mt-4">
              Loading administrators…
            </p>
          ) : records.length === 0 ? (
            <p className="mt-4">No accounts match these filters.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {records.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => select(record)}
                    className={`w-full rounded-lg border p-3 text-left ${selected?.id === record.id ? 'border-primary bg-green-50' : ''}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{record.name}</span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${record.isActive ? 'bg-green-100 text-green-900' : 'bg-slate-200 text-slate-800'}`}
                      >
                        {record.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs break-all">{record.email}</span>
                    <span className="mt-1 block text-xs">{record.role.replaceAll('_', ' ')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Pager page={page} pages={pages} onPage={setPage} />
        </aside>
        <div className="grid gap-6">
          <EditorCard title="Create administrator">
            <TextField
              label="Name"
              value={createValues.name}
              maxLength={150}
              onChange={(name) => setCreateValues((current) => ({ ...current, name }))}
            />
            <TextField
              label="Email"
              value={createValues.email}
              maxLength={255}
              type="email"
              onChange={(email) => setCreateValues((current) => ({ ...current, email }))}
            />
            <TextField
              label="Temporary password"
              value={createValues.password}
              maxLength={128}
              type="password"
              onChange={(password) => setCreateValues((current) => ({ ...current, password }))}
            />
            <RoleField
              value={createValues.role}
              onChange={(role) => setCreateValues((current) => ({ ...current, role }))}
            />
            <Button disabled={saving} onClick={() => void create()}>
              <UserPlus aria-hidden="true" /> Create administrator
            </Button>
          </EditorCard>
          {selected && (
            <EditorCard title="Update administrator">
              <TextField
                label="Name"
                value={updateValues.name}
                maxLength={150}
                onChange={(name) => setUpdateValues((current) => ({ ...current, name }))}
              />
              <RoleField
                value={updateValues.role}
                onChange={(role) => setUpdateValues((current) => ({ ...current, role }))}
              />
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={updateValues.isActive}
                  onChange={(event) =>
                    setUpdateValues((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />{' '}
                Account active
              </label>
              <TextField
                label="New password (optional)"
                value={updateValues.password}
                maxLength={128}
                type="password"
                onChange={(password) => setUpdateValues((current) => ({ ...current, password }))}
              />
              <div className="flex flex-wrap gap-3">
                <Button disabled={saving} onClick={() => void update()}>
                  <Save aria-hidden="true" /> Save changes
                </Button>
                <ConfirmedActionButton
                  disabled={selected.id === currentAdminId}
                  title="Delete administrator?"
                  description={
                    selected.id === currentAdminId
                      ? 'Administrators cannot delete their own account.'
                      : 'The backend will reject deletion of the final active super administrator.'
                  }
                  confirmLabel="Delete administrator"
                  onConfirm={() => remove(selected)}
                >
                  <Trash2 aria-hidden="true" /> Delete
                </ConfirmedActionButton>
              </div>
              {selected.id === currentAdminId && (
                <p className="text-sm text-amber-900">
                  You cannot delete the account currently in use.
                </p>
              )}
            </EditorCard>
          )}
        </div>
      </div>
    </section>
  );
}

function EditorCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-xl border p-5 shadow-sm">
      <h2 className="text-heading text-xl font-semibold">{title}</h2>
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}
function TextField({
  label,
  value,
  onChange,
  maxLength,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border px-3"
      />
    </label>
  );
}
function RoleField({
  value,
  onChange,
}: {
  value: Administrator['role'];
  onChange: (value: Administrator['role']) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold">Role</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Administrator['role'])}
        className="min-h-11 w-full rounded-lg border bg-white px-3"
      >
        <option value="SUPER_ADMIN">Super administrator</option>
        <option value="CONTENT_EDITOR">Content editor</option>
        <option value="FINANCE_VIEWER">Finance viewer</option>
      </select>
    </label>
  );
}
function Filter({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-11 rounded-lg border bg-white px-3"
    >
      {options.map((option, index) => (
        <option key={option || 'all'} value={option}>
          {labels?.[index] ?? (option || `All ${label.toLowerCase()}s`)}
        </option>
      ))}
    </select>
  );
}
function Pager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Administrator pagination"
      className="mt-5 flex items-center justify-between gap-2"
    >
      <Button variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span className="text-xs">
        {page} / {pages}
      </span>
      <Button variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </nav>
  );
}
