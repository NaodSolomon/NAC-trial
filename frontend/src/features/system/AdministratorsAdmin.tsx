'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Trash2, UserPlus } from 'lucide-react';
import { AdminFormField, AdminFormSelect } from '@/components/admin/AdminFormField';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { Button } from '@/components/ui/button';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { useAdminActions } from '@/hooks/use-admin-actions';
import { useAuthStore } from '@/store/auth.store';
import { useAdminList } from '@/hooks/use-admin-list';
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
  passwordPolicyHint,
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

const rolePolicyHint =
  'Super administrators manage accounts and security. Content editors change public content only. Finance viewers can read donation records but change nothing.';

const roleOptions = [
  { value: 'SUPER_ADMIN', label: 'Super administrator' },
  { value: 'CONTENT_EDITOR', label: 'Content editor' },
  { value: 'FINANCE_VIEWER', label: 'Finance viewer' },
] as const;

function toUpdateValues(record: Administrator): AdministratorUpdate {
  return { name: record.name, role: record.role, isActive: record.isActive, password: '' };
}

export function AdministratorsAdmin() {
  const [selected, setSelected] = useState<Administrator | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const currentAdminId = useAuthStore((state) => state.user?.id);
  const { notify } = useAdminFeedback();

  const createForm = useForm<AdministratorEditor>({
    resolver: zodResolver(administratorEditorSchema),
    defaultValues: emptyAdministratorEditor,
  });
  const updateForm = useForm<AdministratorUpdate>({
    resolver: zodResolver(administratorUpdateSchema),
    defaultValues: emptyUpdate,
  });
  const { reset: resetUpdateForm } = updateForm;

  const {
    records,
    page,
    setPage,
    pages,
    loading,
    error,
    setError,
    reload: load,
  } = useAdminList<Administrator>(
    useCallback(
      ({ page, signal }) =>
        listAdministrators({ page, role: roleFilter, isActive: activeFilter, signal }),
      [roleFilter, activeFilter],
    ),
  );

  const select = useCallback(
    (record: Administrator | null) => {
      setSelected(record);
      resetUpdateForm(record ? toUpdateValues(record) : emptyUpdate);
      setError('');
    },
    [resetUpdateForm, setError],
  );

  const { refresh, run } = useAdminActions({
    reload: load,
    queryKey: queryKeys.administrators.all,
  });

  async function onCreate(values: AdministratorEditor) {
    setError('');
    try {
      await createAdministrator(values);
      createForm.reset(emptyAdministratorEditor);
      await refresh();
      notify({
        title: 'Administrator created',
        message: 'The new account can now sign in with its assigned role.',
      });
    } catch (cause) {
      setError(getApiErrorMessageWithDetails(cause));
    }
  }

  async function onUpdate(values: AdministratorUpdate) {
    if (!selected) return;
    setError('');
    try {
      const saved = await updateAdministrator(selected.id, values);
      setSelected(saved);
      resetUpdateForm(toUpdateValues(saved));
      await refresh();
      notify({
        title: 'Administrator updated',
        message: 'Role and account protections were enforced by the backend transaction.',
      });
    } catch (cause) {
      setError(getApiErrorMessageWithDetails(cause));
    }
  }

  async function remove(record: Administrator) {
    await run(
      async () => {
        await deleteAdministrator(record.id);
        if (selected?.id === record.id) select(null);
      },
      {
        title: 'Administrator deleted',
        message: 'The account and its permitted dependent records were handled by the backend.',
      },
    );
  }

  const isOwnAccount = Boolean(currentAdminId) && selected?.id === currentAdminId;
  // An unknown signed-in identity must not enable a destructive action by default.
  const deletionBlocked = !currentAdminId || isOwnAccount;
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
          label="Filter by role"
          value={roleFilter}
          options={['', 'SUPER_ADMIN', 'CONTENT_EDITOR', 'FINANCE_VIEWER']}
          labels={['All roles', 'Super administrator', 'Content editor', 'Finance viewer']}
          onChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
        />
        <Filter
          label="Filter by account status"
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
          ) : error ? null : records.length === 0 ? (
            <AdminEmptyState
              entity="accounts"
              filtered={Boolean(roleFilter || activeFilter)}
              onClearFilters={() => {
                setRoleFilter('');
                setActiveFilter('');
              }}
            />
          ) : (
            <ul className="mt-4 space-y-2">
              {records.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => select(record)}
                    aria-current={selected?.id === record.id ? 'true' : undefined}
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
            <form
              noValidate
              aria-label="Create administrator"
              onSubmit={createForm.handleSubmit(onCreate)}
              className="grid gap-4"
            >
              <AdminFormField
                label="Name"
                id="create-administrator-name"
                maxLength={150}
                autoComplete="off"
                error={createForm.formState.errors.name?.message}
                {...createForm.register('name')}
              />
              <AdminFormField
                label="Email"
                id="create-administrator-email"
                type="email"
                maxLength={255}
                autoComplete="off"
                error={createForm.formState.errors.email?.message}
                {...createForm.register('email')}
              />
              <AdminFormField
                label="Temporary password"
                id="create-administrator-password"
                type="password"
                maxLength={128}
                autoComplete="new-password"
                hint={passwordPolicyHint}
                error={createForm.formState.errors.password?.message}
                {...createForm.register('password')}
              />
              <AdminFormSelect
                label="Role"
                id="create-administrator-role"
                hint={rolePolicyHint}
                error={createForm.formState.errors.role?.message}
                {...createForm.register('role')}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </AdminFormSelect>
              <div>
                <Button type="submit" disabled={createForm.formState.isSubmitting}>
                  <UserPlus aria-hidden="true" /> Create administrator
                </Button>
              </div>
            </form>
          </EditorCard>
          {selected && (
            <EditorCard title="Update administrator">
              <form
                noValidate
                aria-label={`Update ${selected.name}`}
                onSubmit={updateForm.handleSubmit(onUpdate)}
                className="grid gap-4"
              >
                <AdminFormField
                  label="Name"
                  id="update-administrator-name"
                  maxLength={150}
                  autoComplete="off"
                  error={updateForm.formState.errors.name?.message}
                  {...updateForm.register('name')}
                />
                <AdminFormSelect
                  label="Role"
                  id="update-administrator-role"
                  hint={rolePolicyHint}
                  error={updateForm.formState.errors.role?.message}
                  {...updateForm.register('role')}
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminFormSelect>
                <div className="flex min-h-11 items-center gap-3">
                  <input
                    id="update-administrator-active"
                    type="checkbox"
                    className="size-4"
                    {...updateForm.register('isActive')}
                  />
                  <label htmlFor="update-administrator-active" className="font-semibold">
                    Account active
                  </label>
                </div>
                <AdminFormField
                  label="New password (optional)"
                  id="update-administrator-password"
                  type="password"
                  maxLength={128}
                  autoComplete="new-password"
                  hint={`Leave blank to keep the current password. ${passwordPolicyHint}`}
                  error={updateForm.formState.errors.password?.message}
                  {...updateForm.register('password')}
                />
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={updateForm.formState.isSubmitting}>
                    <Save aria-hidden="true" /> Save changes
                  </Button>
                  <ConfirmedActionButton
                    disabled={deletionBlocked}
                    title="Delete administrator?"
                    description={
                      isOwnAccount
                        ? 'Administrators cannot delete their own account.'
                        : `${selected.name} will lose access immediately. The backend will reject deletion of the final active super administrator.`
                    }
                    confirmLabel="Delete administrator"
                    onConfirm={() => remove(selected)}
                  >
                    <Trash2 aria-hidden="true" /> Delete
                  </ConfirmedActionButton>
                </div>
                {isOwnAccount && (
                  <p className="text-sm text-amber-900">
                    You cannot delete the account currently in use.
                  </p>
                )}
              </form>
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
      <div className="mt-5">{children}</div>
    </section>
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
          {labels?.[index] ?? (option ? option.replaceAll('_', ' ') : 'All')}
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
