'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { AdminFormField } from '@/components/admin/AdminFormField';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { useAuthStore } from '@/store/auth.store';
import { getApiErrorMessageWithDetails, isApiRequestError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import {
  createNavigationItem,
  deleteNavigationItem,
  listNavigation,
  reorderNavigationItems,
  updateNavigationItem,
} from './admin-navigation.client';
import {
  navigationEditorSchema,
  type NavigationEditorValues,
  type NavigationItem,
  type NavigationLanguage,
} from './admin-navigation.schemas';

const emptyEditor: NavigationEditorValues = { label: '', url: '' };
const destinationHint = 'An internal path such as /about, or a full https:// address.';

export function NavigationAdmin() {
  const [language, setLanguage] = useState<NavigationLanguage>('en');
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const role = useAuthStore((state) => state.user?.role);
  const queryClient = useQueryClient();
  const { notify } = useAdminFeedback();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NavigationEditorValues>({
    resolver: zodResolver(navigationEditorSchema),
    defaultValues: emptyEditor,
  });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void listNavigation(language, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setItems(result.data);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        if (isApiRequestError(loadError) && loadError.status === 403) setForbidden(true);
        else setError(getApiErrorMessageWithDetails(loadError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [language]);

  const refreshPublicNavigation = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.navigation.all });
    await queryClient.refetchQueries({ queryKey: queryKeys.navigation.all, type: 'active' });
  }, [queryClient]);

  const replaceItem = useCallback((updated: NavigationItem) => {
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  async function createItem(values: NavigationEditorValues) {
    setError('');
    try {
      const order = items.length
        ? Math.min(10_000, Math.max(...items.map((item) => item.order)) + 10)
        : 0;
      const created = await createNavigationItem(language, values, order);
      setItems((current) => [...current, created]);
      reset(emptyEditor);
      await refreshPublicNavigation();
      notify({
        title: 'Navigation item created',
        message: `${created.label} was added to ${language.toUpperCase()}.`,
      });
    } catch (createError) {
      setError(getApiErrorMessageWithDetails(createError));
    }
  }

  const saveItem = useCallback(
    async (item: NavigationItem, values: NavigationEditorValues) => {
      setBusy(item.id);
      try {
        const updated = await updateNavigationItem(item.id, values);
        replaceItem(updated);
        await refreshPublicNavigation();
        notify({ title: 'Navigation item saved', message: updated.label });
      } finally {
        setBusy('');
      }
    },
    [notify, refreshPublicNavigation, replaceItem],
  );

  const toggleVisibility = useCallback(
    async (item: NavigationItem) => {
      setBusy(item.id);
      try {
        replaceItem(await updateNavigationItem(item.id, { isVisible: !item.isVisible }));
        await refreshPublicNavigation();
      } finally {
        setBusy('');
      }
    },
    [refreshPublicNavigation, replaceItem],
  );

  const removeItem = useCallback(
    async (item: NavigationItem) => {
      setBusy(item.id);
      try {
        await deleteNavigationItem(item.id);
        setItems((current) => current.filter(({ id }) => id !== item.id));
        await refreshPublicNavigation();
        notify({ title: 'Navigation item deleted', message: item.label });
      } finally {
        setBusy('');
      }
    },
    [notify, refreshPublicNavigation],
  );

  async function move(index: number, direction: -1 | 1) {
    const otherIndex = index + direction;
    if (!items[otherIndex]) return;
    setBusy('reorder');
    setError('');
    try {
      await reorderNavigationItems(items[index], items[otherIndex]);
      setItems((current) => {
        const next = [...current];
        [next[index], next[otherIndex]] = [next[otherIndex], next[index]];
        return next;
      });
      await refreshPublicNavigation();
    } catch (reorderError) {
      setError(`${getApiErrorMessageWithDetails(reorderError)} The saved order will be reloaded.`);
      try {
        const result = await listNavigation(language);
        setItems(result.data);
      } catch {
        setError(
          'The order could not be changed, and the saved order could not be reloaded. Reload the page before editing further.',
        );
      }
    } finally {
      setBusy('');
    }
  }

  if (forbidden) return <AdminAccessDenied />;
  return (
    <section aria-labelledby="navigation-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">Public shell</p>
      <h1
        id="navigation-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        Navigation
      </h1>
      <p className="text-foreground mt-2 max-w-2xl">
        Edit and order each language independently. Hidden items disappear from the public header
        and footer.
      </p>

      <div
        className="mt-6 inline-flex rounded-lg border bg-white p-1"
        role="tablist"
        aria-label="Navigation language"
      >
        {(['en', 'am'] as const).map((code) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={language === code}
            onClick={() => setLanguage(code)}
            className={`min-h-11 rounded-md px-5 text-sm font-semibold ${language === code ? 'bg-primary text-white' : ''}`}
          >
            {code === 'en' ? 'English' : 'Amharic'}
          </button>
        ))}
      </div>

      <form
        noValidate
        aria-label="Add navigation item"
        className="bg-card mt-6 grid items-start gap-4 rounded-xl border p-5 shadow-sm md:grid-cols-[1fr_1fr_auto]"
        onSubmit={handleSubmit(createItem)}
      >
        <AdminFormField
          label="New label"
          id="new-navigation-label"
          maxLength={100}
          error={errors.label?.message}
          {...register('label')}
        />
        <AdminFormField
          label="New destination"
          id="new-navigation-url"
          placeholder="/about"
          maxLength={500}
          hint={destinationHint}
          error={errors.url?.message}
          {...register('url')}
        />
        <Button className="mt-9" type="submit" disabled={isSubmitting}>
          <Plus aria-hidden="true" /> Add item
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
        <div
          role="status"
          aria-label="Loading navigation"
          className="bg-card mt-6 h-56 animate-pulse rounded-xl border motion-reduce:animate-none"
        />
      ) : items.length === 0 ? (
        <p role="status" className="bg-card mt-6 rounded-xl border p-8">
          No {language.toUpperCase()} navigation items exist yet.
        </p>
      ) : (
        <ol className="mt-6 space-y-3">
          {items.map((item, index) => (
            <li key={item.id}>
              <NavigationItemRow
                item={item}
                canDelete={role === 'SUPER_ADMIN'}
                busy={busy === item.id}
                reordering={busy === 'reorder'}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                onMove={(direction) => move(index, direction)}
                onSave={saveItem}
                onToggleVisibility={toggleVisibility}
                onDelete={removeItem}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function NavigationItemRow({
  item,
  canDelete,
  busy,
  reordering,
  isFirst,
  isLast,
  onMove,
  onSave,
  onToggleVisibility,
  onDelete,
}: {
  item: NavigationItem;
  canDelete: boolean;
  busy: boolean;
  reordering: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void | Promise<void>;
  onSave: (item: NavigationItem, values: NavigationEditorValues) => Promise<void>;
  onToggleVisibility: (item: NavigationItem) => Promise<void>;
  onDelete: (item: NavigationItem) => Promise<void>;
}) {
  const [rowError, setRowError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NavigationEditorValues>({
    resolver: zodResolver(navigationEditorSchema),
    defaultValues: { label: item.label, url: item.url },
  });

  useEffect(() => {
    reset({ label: item.label, url: item.url });
  }, [item.label, item.url, reset]);

  async function submit(values: NavigationEditorValues) {
    setRowError('');
    try {
      await onSave(item, values);
    } catch (saveError) {
      setRowError(`${getApiErrorMessageWithDetails(saveError)} Your edits are still on screen.`);
    }
  }

  async function toggle() {
    setRowError('');
    try {
      await onToggleVisibility(item);
    } catch (toggleError) {
      setRowError(getApiErrorMessageWithDetails(toggleError));
    }
  }

  return (
    <form
      noValidate
      aria-label={`Edit ${item.label}`}
      onSubmit={handleSubmit(submit)}
      className="bg-card grid items-start gap-4 rounded-xl border p-5 shadow-sm lg:grid-cols-[auto_1fr_1fr_auto]"
    >
      <div className="mt-9 flex gap-1">
        <button
          type="button"
          aria-label={`Move ${item.label} up`}
          disabled={isFirst || reordering}
          onClick={() => void onMove(-1)}
          className="min-h-11 min-w-11 rounded-md border p-2 disabled:opacity-40"
        >
          <ArrowUp aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Move ${item.label} down`}
          disabled={isLast || reordering}
          onClick={() => void onMove(1)}
          className="min-h-11 min-w-11 rounded-md border p-2 disabled:opacity-40"
        >
          <ArrowDown aria-hidden="true" className="size-4" />
        </button>
      </div>
      <AdminFormField
        label="Label"
        id={`navigation-label-${item.id}`}
        maxLength={100}
        error={errors.label?.message}
        {...register('label')}
      />
      <AdminFormField
        label="Destination"
        id={`navigation-url-${item.id}`}
        maxLength={500}
        error={errors.url?.message}
        {...register('url')}
      />
      <div className="mt-9 flex flex-wrap items-start gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => void toggle()}>
          {item.isVisible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
          {item.isVisible ? 'Visible' : 'Hidden'}
        </Button>
        <Button type="submit" disabled={busy}>
          <Save aria-hidden="true" /> Save
        </Button>
        {canDelete && (
          <ConfirmedActionButton
            title="Delete navigation item?"
            description={`“${item.label}” will be removed from the ${item.languageCode.toUpperCase()} header and footer. This cannot be undone.`}
            confirmLabel="Delete item"
            disabled={busy}
            onConfirm={() => onDelete(item)}
          >
            <Trash2 aria-hidden="true" /> Delete
          </ConfirmedActionButton>
        )}
      </div>
      {rowError && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 lg:col-span-4"
        >
          {rowError}
        </p>
      )}
    </form>
  );
}
